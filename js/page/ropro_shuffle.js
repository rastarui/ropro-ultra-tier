//--------------------RoPro Shuffle--------------------
//Developer Note:
//RoPro Shuffle is a preview feature, the full version will be available with the release of RoPro v2.0.
//We are still in development of RoPro v2.0. It is a rewrite of RoPro which will be far more stable and maintanable than RoPro v1.5.
//RoPro v2.0 is a Manifest v3 extension, and uses React & Typescript to vastly improve the RoPro codebase. We're also rebuilding the backend infrastructure to improve reliability.

window.__roproShuffleScriptInjected = true;
window.__roproShuffleScriptLoaded = false;
window.__roproShuffleScriptLoadError = "";
if (document?.documentElement != null) {
  document.documentElement.setAttribute("data-ropro-shuffle-injected", "true");
  document.documentElement.setAttribute("data-ropro-shuffle-loaded", "false");
  document.documentElement.setAttribute("data-ropro-shuffle-load-error", "");
}

//Utility functions, in RoPro v2.0 these will be imported from an ES6 module to avoid duplicate code.
function addCommas(nStr) {
  return roproApiAdapter.addCommas(nStr);
}

function kFormatter(num) {
  return Math.abs(num) > 999
    ? Math.abs(num) > 999999
      ? Math.sign(num) * (Math.abs(num) / 1000000).toFixed(1) + "m"
      : Math.sign(num) * (Math.abs(num) / 1000).toFixed(1) + "k"
    : Math.sign(num) * Math.abs(num);
}

var url_matches = ["/discover*", "/discover/*", "/charts*", "/charts/*", "/genre-search*", "/genre-search/*"];

function verifyPath(matches) {
  return roproApiAdapter.verifyPath(matches);
}

function buildRoProLoader(options) {
  return roproApiAdapter.buildBrandedLoaderHtml(options);
}

//Make sure we're on the right page here, factoring in the recently added locale subpaths (Ex: "roblox.com/en-us/games/...").
//The content script matches defined in manifest.json should mostly handle this, but verifyPath() accounts for rare edge cases.
//In RoPro v2.0 this will be an ES6 imported module function to avoid duplicate code.
if (!verifyPath(url_matches)) {
  window.__roproShuffleScriptLoadError = "invalid-path:" + window.location.pathname;
  if (document?.documentElement != null) {
    document.documentElement.setAttribute("data-ropro-shuffle-load-error", window.__roproShuffleScriptLoadError);
  }
  throw new Error("RoPro Error: Invalid path!");
}
window.__roproShuffleScriptLoaded = true;
if (document?.documentElement != null) {
  document.documentElement.setAttribute("data-ropro-shuffle-loaded", "true");
  document.documentElement.setAttribute("data-ropro-shuffle-load-error", "");
}

//Properly match the RoPro Sorts style to the Roblox.com site theme.
var theme = $(".light-theme").length > 0 ? "light" : "dark";

//Get language code of current user.
var language_code = $("meta[name='locale-data']").attr("data-language-code");

//Global variables for the RoPro Sorts feature.
var allExperiencesLeftScroll = 0;
var popularTodayMode = false;
var allExperiencesLoading = false;
var ROPRO_ALL_EXPERIENCES_METADATA_BATCH_SIZE = 50;
var ROPRO_ALL_EXPERIENCES_THUMBNAIL_BATCH_SIZE = 100;
var ROPRO_ALL_EXPERIENCES_HORIZONTAL_THUMBNAIL_SIZE = "768x432";
var ROPRO_ROBLOX_THUMBNAIL_BATCH_MAX_REQUESTS = 90;

//API Fetching functions. These are outsourced to the background.js file due to CORS.
function fetchExperiences(options) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        greeting: "GetURL",
        url: `https://node.ropro.io/experiences/list?page=${options.page}&language_code=${options.language_code}&order=${options.order}`,
      },
      function (data) {
        resolve(data);
      }
    );
  });
}

async function hydrateAllExperiencesWithRobloxMetadata(experiences) {
  if (!Array.isArray(experiences) || experiences.length == 0) {
    return experiences;
  }
  var universeIds = Array.from(
    new Set(
      experiences
        .map(function (experience) {
          return parsePositiveInteger(experience?.id || experience?.universeId);
        })
        .filter(function (universeId) {
          return universeId != null;
        })
    )
  );
  if (universeIds.length == 0) {
    return experiences;
  }

  var metadataByUniverseId = new Map();
  var metadataBatches = chunkArray(universeIds, ROPRO_ALL_EXPERIENCES_METADATA_BATCH_SIZE);
  for (var i = 0; i < metadataBatches.length; i++) {
    try {
      var metadataResponse = await fetchUniverseGenres(metadataBatches[i]);
      if (Array.isArray(metadataResponse?.data)) {
        metadataResponse.data.forEach(function (gameData) {
          var universeId = parsePositiveInteger(gameData?.id);
          if (universeId == null) {
            return;
          }
          var name = normalizeGenreLabel(gameData?.name, "");
          var playing = parseInt(gameData?.playing, 10);
          if (!Number.isFinite(playing) || playing < 0) {
            playing = null;
          }
          var rootPlaceId = parsePositiveInteger(gameData?.rootPlaceId || gameData?.rootplaceid);
          metadataByUniverseId.set(universeId, {
            name: name,
            active: playing,
            rootPlaceId: rootPlaceId,
          });
        });
      }
    } catch (_) {}
    if (i < metadataBatches.length - 1) {
      await sleepMs(80);
    }
  }

  var thumbnailTargetsByUniverseId = new Map();
  experiences.forEach(function (experience) {
    if (experience == null || typeof experience != "object") {
      return;
    }
    var universeId = parsePositiveInteger(experience.id || experience.universeId);
    if (universeId == null) {
      return;
    }
    var metadata = metadataByUniverseId.get(universeId);
    var placeId = parsePositiveInteger(
      experience.place_id || experience.placeId || experience.rootPlaceId || metadata?.rootPlaceId
    );
    var existingTarget = thumbnailTargetsByUniverseId.get(universeId);
    if (placeId == null && existingTarget != null && existingTarget.placeId != null) {
      placeId = existingTarget.placeId;
    }
    thumbnailTargetsByUniverseId.set(universeId, {
      universeId: universeId,
      placeId: placeId,
    });
  });

  var thumbnailByUniverseId = new Map();
  var thumbnailBatches = chunkArray(
    Array.from(thumbnailTargetsByUniverseId.values()),
    ROPRO_ALL_EXPERIENCES_THUMBNAIL_BATCH_SIZE
  );
  for (var j = 0; j < thumbnailBatches.length; j++) {
    try {
      var resolvedThumbnailBatch = await fetchAllExperiencesCardThumbnails(thumbnailBatches[j]);
      if (resolvedThumbnailBatch instanceof Map) {
        resolvedThumbnailBatch.forEach(function (imageUrl, universeId) {
          thumbnailByUniverseId.set(universeId, imageUrl);
        });
      }
    } catch (_) {}
    if (j < thumbnailBatches.length - 1) {
      await sleepMs(80);
    }
  }

  experiences.forEach(function (experience) {
    if (experience == null || typeof experience != "object") {
      return;
    }
    var universeId = parsePositiveInteger(experience.id || experience.universeId);
    if (universeId == null) {
      return;
    }
    var metadata = metadataByUniverseId.get(universeId);
    if (typeof metadata?.name == "string" && metadata.name.length > 0) {
      experience.name = metadata.name;
    }
    if (Number.isFinite(metadata?.active) && metadata.active >= 0) {
      experience.active = metadata.active;
    }
    var placeId = parsePositiveInteger(
      experience.place_id || experience.placeId || experience.rootPlaceId || metadata?.rootPlaceId
    );
    if (placeId != null) {
      experience.place_id = placeId;
    }
    var thumbnailUrl = thumbnailByUniverseId.get(universeId);
    if (typeof thumbnailUrl == "string" && thumbnailUrl.length > 0) {
      experience.thumbnail = thumbnailUrl;
    }
  });

  return experiences;
}

function normalizeNumericMetric(value) {
  var parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed * 10) / 10;
}

function sanitizeHttpUrl(value) {
  if (typeof value != "string") {
    return "";
  }
  var trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return "";
  }
  return stripTags(trimmed);
}

function fetchSetting(setting) {
  return roproApiAdapter.getSetting(setting);
}

function fetchCachedGenreGames(payload) {
  return new Promise((resolve) => {
    roproApiAdapter.request("ropro_get_cached_genre_games", payload, function (data) {
      resolve(data);
    });
  });
}

function setRoProGenreDebugAttribute(name, value) {
  if (document?.documentElement == null) {
    return;
  }
  if (value == null || value === "") {
    document.documentElement.removeAttribute(name);
    return;
  }
  document.documentElement.setAttribute(name, String(value));
}

function addExperience(experience) {
  var popularMetricLabelStyle = "font-size:12px;color:#FFFFFF;font-weight:500;text-shadow:0 1px 2px rgba(0,0,0,0.85);";
  var popularMetricIconStyle = "width:13px;height:13px;display:inline-block;vertical-align:middle;margin-right:4px;margin-left:3px;margin-top:-1px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));";
  var popularMetricSymbolStyle = "filter:drop-shadow(0 1px 2px rgba(0,0,0,0.85));";
  var roproMetricIcon = `<img style="${popularMetricIconStyle}" src="${chrome.runtime.getURL('/images/ropro_icon_small.png')}" class="info-label ropro-popular-metric-icon" alt="" aria-hidden="true">`;
  var safeName = stripTags(experience.name);
  var safeThumbnail = sanitizeHttpUrl(experience.thumbnail);
  var safeExperienceId = parseInt(experience.id);
  var safePlaceId = parseInt(experience.place_id);
  var safeLikes = parseInt(experience.likes);
  var safeActivePlayers = parseInt(experience.active);
  if (!Number.isFinite(safeExperienceId) || !Number.isFinite(safePlaceId)) {
    return;
  }
  if (!Number.isFinite(safeLikes)) {
    safeLikes = 0;
  }
  if (!Number.isFinite(safeActivePlayers)) {
    safeActivePlayers = 0;
  }
  var playerMetricHtml = `<span class="info-label icon-playing-counts-gray-white-70" style="${popularMetricSymbolStyle}"></span><span class="info-label playing-counts-label" style="${popularMetricLabelStyle}" title="${safeActivePlayers} active players">${addCommas(safeActivePlayers)}</span>`;
  var secondaryMetricHtml = popularTodayMode ? `${roproMetricIcon}${playerMetricHtml}` : playerMetricHtml;
  experience_html = `<li class="list-item large-game-tile game-tile-container ropro-all-experiences-card large-tile-universe-${safeExperienceId}" title="${safeName}" style="width:300px;height:170px;padding-bottom:0;margin-bottom:0;">
      <a href="https://www.roblox.com/games/${safePlaceId}" class="game-card-link large-game-tile-container" style="width:300px;height:170px;display:block;" id="${safeExperienceId}">
        <div class="cursor-pointer" style="height:170px;">
          <div class="large-game-tile-thumb-container placeholder-game-thumbnail" style="position:relative;overflow:hidden;border-radius:10px;width:300px;height:170px;">
            <img class="placeholder-game-thumbnail large-game-tile-thumb" style="width:300px;height:170px;" src="${safeThumbnail}" alt="${safeName}" title="${safeName}" />
            <div class="large-game-tile-overlay" style="border-radius:10px;width:300px;height:170px;">
              <div class="large-game-tile-info-container">
                <h1 class="text-overflow large-game-tile-name" style="padding-bottom:0px;font-size:14px;line-height:1.2;">${safeName}</h1>
                <div class="game-card-info large-game-tile-info" style="padding-top:0px;">
                  <span class="info-label icon-votes-gray-white-70" style="${popularMetricSymbolStyle}"></span>
                  <span class="info-label vote-percentage-label" style="${popularMetricLabelStyle}">${safeLikes}%</span>
                  ${secondaryMetricHtml}
                </div>
              </div>
            </div>
          </div>
        </div>
      </a>
    </li>`;
  $('.ropro-all-experiences-game-cards:first').append(experience_html);
}

var all_experiences_options = {
  language_code: language_code,
  order: "active",
  page: 0
}

function setAllExperiencesArrowDisabled(selector, disabled) {
  var arrow = $(selector).first();
  if (arrow.length == 0) {
    return;
  }
  arrow.toggleClass("disabled", disabled);
  arrow.attr("aria-disabled", disabled ? "true" : "false");
  arrow.attr("tabindex", disabled ? "-1" : "0");
}

function getAllExperiencesScrollMetrics() {
  var cardWidth = $('.ropro-all-experiences-list-container:first .ropro-all-experiences-card:first').outerWidth(true);
  var viewportWidth = $('.ropro-all-experiences-list-container:first .horizontal-scroll-window:first').outerWidth();
  if (!cardWidth || cardWidth <= 0 || !viewportWidth || viewportWidth <= 0) {
    return null;
  }
  return {
    cardWidth: cardWidth,
    viewportWidth: viewportWidth,
    visibleCards: Math.max(1, Math.floor(viewportWidth / cardWidth))
  };
}

function updateAllExperiencesScrollState() {
  var metrics = getAllExperiencesScrollMetrics();
  if (metrics == null) {
    setAllExperiencesArrowDisabled(".ropro-all-experiences-scroll-prev:first", true);
    setAllExperiencesArrowDisabled(".ropro-all-experiences-scroll-next:first", true);
    return;
  }
  var currentCardOffset = Math.abs(Math.floor(allExperiencesLeftScroll / metrics.cardWidth));
  var totalCards = $('.ropro-all-experiences-list-container:first .ropro-all-experiences-card').length;
  var prevDisabled = currentCardOffset <= 0;
  var nextDisabled = totalCards <= currentCardOffset + metrics.visibleCards;
  setAllExperiencesArrowDisabled(".ropro-all-experiences-scroll-prev:first", prevDisabled);
  setAllExperiencesArrowDisabled(".ropro-all-experiences-scroll-next:first", nextDisabled);
}

function resetAllExperiencesScrollPosition() {
  allExperiencesLeftScroll = 0;
  $('.ropro-all-experiences-list-container:first .horizontally-scrollable:first').css('left', "0px");
  updateAllExperiencesScrollState();
}

async function loadAllExperiences() {
  if (allExperiencesLoading) {
    return;
  }
  allExperiencesLoading = true;
  $('.ropro-all-experiences-list-container:first .ropro-experiences-loading-spinner:first').css('display', 'flex');
  var experiences = [];
  await fetchExperiences(all_experiences_options).then(async (data) => {
    if (Array.isArray(data)) {
      experiences = data;
      experiences = await hydrateAllExperiencesWithRobloxMetadata(experiences);
      if (
        popularTodayMode &&
        all_experiences_options.order == "popular_today" &&
        experiences.every((experience) => normalizeNumericMetric(experience.time) == null)
      ) {
        all_experiences_options.order = "active";
        experiences = await fetchExperiences(all_experiences_options);
        experiences = await hydrateAllExperiencesWithRobloxMetadata(Array.isArray(experiences) ? experiences : []);
      }
      experiences.forEach((experience) => {
        addExperience(experience);
      });
      updateAllExperiencesScrollState();
    }
    $('.ropro-all-experiences-list-container:first .ropro-experiences-loading-spinner:first').css('display', 'none');
    allExperiencesLoading = false;
  });
}

async function addAllExperiences() {
  var popularTodayEnabled = (await fetchSetting("popularToday")) === true;
  if (!popularTodayEnabled) {
    return;
  }
  var roproShuffle = await fetchSetting("roproShuffle");
  var showPopularTodayTitle = popularTodayEnabled;
  var allExperiencesTitle = showPopularTodayTitle ? "Popular Today Globally with RoPro Users" : "All Experiences";
  var allExperiencesTitleColorStyle = theme == "light" ? "color:#272930;" : "color:#FFFFFF;";
  var showShuffleButton = roproShuffle;
  popularTodayMode = showPopularTodayTitle;
  all_experiences_options.order = popularTodayMode ? "popular_today" : "active";
  all_experiences_options.page = 0;
  allExperiencesLeftScroll = 0;
  ropro_all_experiences_section_html = `
    <div class="ropro-all-experiences-list-container games-list-container is-windows" style="margin-bottom:12px;margin-left:0px;margin-right:0px;">
      <div class="home-sort-header-container ropro-all-experiences-title" style="margin-bottom:16px;">
        <div id="allExperiences" data-page="0" class="container-header games-filter-changer">
          <h3 style="margin-left:10px;position:relative;margin-top:0px;margin-bottom:0px;${allExperiencesTitleColorStyle}">${allExperiencesTitle}</h3>
          <div class="ropro-all-experiences-shuffle" style="${showShuffleButton ? '' : 'display:none;'}user-select:none;cursor:pointer;margin-right:10px;margin-left:0px;margin-top:-7px;background-opacity:50%;float:right;border-radius:5px;font-weight:400;padding:5px;padding-left:10px;padding-right:10px;border:1px solid rgba(255, 255, 255, 0.4)!important"><span class="ropro-shuffle-button-label">RoPro Shuffle</span><img src="${chrome.runtime.getURL('/images/reload.png')}" style="filter:invert(1);width:20px;margin-left:5px;margin-top:-2px;"></div>
        </div>
      </div>
      <div data-testid="game-carousel" class="horizontal-scroller games-list dynamic-layout-sizing-disabled new-scroll-arrows">
        ${buildRoProLoader({ id: "allExperiencesLoading", className: "ropro-experiences-loading-spinner ropro-branded-loader-fill" })}
        <div class="clearfix horizontal-scroll-window">
            <div class="horizontally-scrollable" style="left: 0px;">
              <ul id="allExperiencesList" class="hlist games game-cards game-tile-list games-page-carousel ropro-all-experiences-game-cards"></ul>
            </div>
            <div data-testid="game-carousel-scroll-bar" style="z-index:2;" class="ropro-all-experiences-scroll-prev scroller-new prev disabled" aria-disabled="true" role="button" tabindex="-1">
              <span class="icon-chevron-heavy-left"></span>
            </div>
            <div data-testid="game-carousel-scroll-bar" style="z-index:2;" class="ropro-all-experiences-scroll-next scroller-new next" aria-disabled="false" role="button" tabindex="0">
              <span class="icon-chevron-heavy-right"></span>
            </div>
        </div>
      </div>
    </div>
    `;
    var gamesPageSection = $('.games-page-container').first().find('> .section').first();
    if (gamesPageSection.length == 0) {
      gamesPageSection = $('.games-page-container:first .section:first');
    }
    var gamesPageFilters = gamesPageSection.find('> .filters-container').first();
    if (gamesPageFilters.length == 0) {
      gamesPageFilters = gamesPageSection.find('.filters-container:first');
    }
    var gamesPageHeader = gamesPageSection.find('> .games-list-header').first();
    if (gamesPageHeader.length == 0) {
      gamesPageHeader = gamesPageSection.find('.games-list-header:first');
    }
    var gamesPageFirstList = gamesPageSection.find('> .games-list-container').first();
    if (gamesPageFirstList.length == 0) {
      gamesPageFirstList = gamesPageSection.find('.games-list-container:first');
    }
    var gamesPageLists = gamesPageSection.find('> .games-list-container');
    if (gamesPageLists.length == 0) {
      gamesPageLists = gamesPageSection.find('.games-list-container');
    }
    if (gamesPageLists.length >= 3) {
      gamesPageLists.eq(2).after(ropro_all_experiences_section_html);
    } else if (gamesPageLists.length >= 2) {
      gamesPageLists.eq(1).after(ropro_all_experiences_section_html);
    } else if (gamesPageLists.length > 0) {
      gamesPageLists.eq(0).after(ropro_all_experiences_section_html);
    } else if (gamesPageFilters.length > 0) {
      gamesPageFilters.after(ropro_all_experiences_section_html);
    } else if (gamesPageHeader.length > 0) {
      gamesPageHeader.after(ropro_all_experiences_section_html);
    } else if (gamesPageFirstList.length > 0) {
      gamesPageFirstList.before(ropro_all_experiences_section_html);
    } else if (gamesPageSection.length > 0) {
      gamesPageSection.after(ropro_all_experiences_section_html);
    }
    $('.ropro-all-experiences-scroll-next:first').click(allExperiencesNext);
    $('.ropro-all-experiences-scroll-prev:first').click(allExperiencesPrev);
    $('.ropro-all-experiences-scroll-next:first').keydown(function (event) {
      if (event.key == "Enter" || event.key == " ") {
        event.preventDefault();
        allExperiencesNext();
      }
    });
    $('.ropro-all-experiences-scroll-prev:first').keydown(function (event) {
      if (event.key == "Enter" || event.key == " ") {
        event.preventDefault();
        allExperiencesPrev();
      }
    });
    $('.ropro-all-experiences-shuffle').click(function () {
      $('.ropro-all-experiences-title').css('display', 'block');
      $('.ropro-shuffle-button-label').text('Shuffle Again');
      all_experiences_options.page = 0;
      all_experiences_options.order = "shuffle";
      $('.ropro-all-experiences-list-container:first .ropro-all-experiences-card').remove();
      resetAllExperiencesScrollPosition();
      loadAllExperiences();
    });
  updateAllExperiencesScrollState();
  loadAllExperiences();
}

function allExperiencesNext() {
  var metrics = getAllExperiencesScrollMetrics();
  if (metrics == null) {
    return;
  }
  if (!$('.ropro-all-experiences-scroll-next:first').hasClass('disabled')) {
    allExperiencesLeftScroll -= metrics.visibleCards * metrics.cardWidth;
    $('.ropro-all-experiences-list-container:first .horizontally-scrollable:first').css('left', allExperiencesLeftScroll + 'px');
    if ($('.ropro-all-experiences-list-container:first .ropro-all-experiences-card').length <
        Math.abs(Math.floor(allExperiencesLeftScroll / metrics.cardWidth)) +
          metrics.visibleCards) {
      setAllExperiencesArrowDisabled('.ropro-all-experiences-scroll-next:first', true);
      if (all_experiences_options.order != "shuffle") {
        all_experiences_options.page++;
      }
      loadAllExperiences();
    }
    updateAllExperiencesScrollState();
  }
};

function allExperiencesPrev() {
  var metrics = getAllExperiencesScrollMetrics();
  if (metrics == null) {
    return;
  }
  if (!$('.ropro-all-experiences-scroll-prev:first').hasClass('disabled')) {
    allExperiencesLeftScroll += metrics.visibleCards * metrics.cardWidth;
    allExperiencesLeftScroll = Math.min(0, allExperiencesLeftScroll);
    $('.ropro-all-experiences-list-container:first .horizontally-scrollable:first').css('left', allExperiencesLeftScroll + 'px');
    updateAllExperiencesScrollState();
  }
}

function getNormalizedRobloxPath(pathname) {
  if (typeof pathname != "string") {
    return "";
  }
  if (!pathname.startsWith("/")) {
    pathname = "/" + pathname;
  }
  var pathSegments = pathname.split("/");
  if (pathSegments.length > 2) {
    try {
      if (Intl.getCanonicalLocales(pathSegments[1]).length > 0) {
        return "/" + pathSegments.slice(2).join("/");
      }
    } catch (_) {}
  }
  return pathname;
}

function isChartsPagePath() {
  return getNormalizedRobloxPath(window.location.pathname).startsWith("/charts");
}

function isRoProGenreStandalonePath(pathname) {
  return getNormalizedRobloxPath(pathname || window.location.pathname).startsWith("/genre-search");
}

function isRoProGenreSupportedPath() {
  return isChartsPagePath() || isRoProGenreStandalonePath();
}

function isChartsPageDefaultView() {
  if (!isChartsPagePath()) {
    return true;
  }
  try {
    var params = new URL(window.location.href).searchParams;
    var device = (params.get("device") || "computer").toLowerCase();
    return device === "computer";
  } catch (_) {
    return true;
  }
}

function fetchUrl(url) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ greeting: "GetURL", url: url }, function (data) {
      resolve(data);
    });
  });
}

function fetchUniverseGenres(universeIds) {
  if (!Array.isArray(universeIds) || universeIds.length == 0) {
    return Promise.resolve({ data: [] });
  }
  return fetchUrl("https://games.roblox.com/v1/games?universeIds=" + universeIds.join(","));
}

function normalizeRobloxThumbnailBatchPayload(payload) {
  var parsedPayload = payload;
  if (typeof parsedPayload == "string") {
    var trimmedPayload = parsedPayload.trim();
    if (trimmedPayload.length == 0 || trimmedPayload.toUpperCase() == "ERROR") {
      return { data: [] };
    }
    try {
      parsedPayload = JSON.parse(trimmedPayload);
    } catch (_) {
      return { data: [] };
    }
  }
  if (Array.isArray(parsedPayload)) {
    return { data: parsedPayload };
  }
  if (parsedPayload != null && typeof parsedPayload == "object" && Array.isArray(parsedPayload.data)) {
    return { data: parsedPayload.data };
  }
  return { data: [] };
}

function fetchRobloxThumbnailBatch(batchPayload) {
  if (!Array.isArray(batchPayload) || batchPayload.length == 0) {
    return Promise.resolve({ data: [] });
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        greeting: "PostValidatedURL",
        url: "https://thumbnails.roblox.com/v1/batch",
        jsonData: batchPayload,
      },
      function (data) {
        resolve(normalizeRobloxThumbnailBatchPayload(data));
      }
    );
  });
}

function parseRobloxThumbnailBatchRequestMetadata(requestId) {
  if (typeof requestId != "string") {
    return { universeId: null, requestType: "" };
  }
  var requestIdParts = requestId.split("::");
  if (requestIdParts.length < 2) {
    return { universeId: null, requestType: "" };
  }
  var universeId = parsePositiveInteger(requestIdParts[0]);
  var requestType = "";
  if (typeof requestIdParts[1] == "string") {
    requestType = requestIdParts[1].split(":")[0] || "";
  }
  return {
    universeId: universeId,
    requestType: requestType,
  };
}

async function fetchAllExperiencesCardThumbnails(experienceTargets) {
  var normalizedTargetsByUniverseId = new Map();
  var placeIdToUniverseIdMap = new Map();
  (Array.isArray(experienceTargets) ? experienceTargets : []).forEach(function (target) {
    if (target == null || typeof target != "object") {
      return;
    }
    var universeId = parsePositiveInteger(target.universeId || target.id || target.targetId);
    if (universeId == null) {
      return;
    }
    var placeId = parsePositiveInteger(target.placeId || target.rootPlaceId || target.place_id);
    normalizedTargetsByUniverseId.set(universeId, {
      universeId: universeId,
      placeId: placeId,
    });
    if (placeId != null) {
      placeIdToUniverseIdMap.set(placeId, universeId);
    }
  });
  if (normalizedTargetsByUniverseId.size == 0) {
    return new Map();
  }

  var batchPayload = [];
  normalizedTargetsByUniverseId.forEach(function (target, universeId) {
    if (target.placeId != null) {
      batchPayload.push({
        requestId:
          universeId +
          "::Asset:" +
          ROPRO_ALL_EXPERIENCES_HORIZONTAL_THUMBNAIL_SIZE +
          ":webp:regular:",
        type: "Asset",
        targetId: target.placeId,
        token: "",
        format: "webp",
        size: ROPRO_ALL_EXPERIENCES_HORIZONTAL_THUMBNAIL_SIZE,
        version: "",
      });
    }
    batchPayload.push({
      requestId: universeId + "::GameIcon:256x256:webp:regular:",
      type: "GameIcon",
      targetId: universeId,
      token: "",
      format: "webp",
      size: "256x256",
      version: "",
    });
  });

  var preferredThumbnailByUniverseId = new Map();
  var fallbackThumbnailByUniverseId = new Map();
  var payloadChunks = chunkArray(batchPayload, ROPRO_ROBLOX_THUMBNAIL_BATCH_MAX_REQUESTS);
  for (var i = 0; i < payloadChunks.length; i++) {
    var thumbnailBatchResponse = await fetchRobloxThumbnailBatch(payloadChunks[i]);
    if (!Array.isArray(thumbnailBatchResponse?.data)) {
      continue;
    }
    thumbnailBatchResponse.data.forEach(function (row) {
      var requestMetadata = parseRobloxThumbnailBatchRequestMetadata(row?.requestId);
      var universeId = requestMetadata.universeId;
      var requestType = requestMetadata.requestType;
      var targetId = parsePositiveInteger(row?.targetId);
      if (universeId == null) {
        if (targetId != null && placeIdToUniverseIdMap.has(targetId)) {
          universeId = placeIdToUniverseIdMap.get(targetId);
          requestType = "Asset";
        } else if (targetId != null) {
          universeId = targetId;
          requestType = "GameIcon";
        }
      }
      if (universeId == null) {
        return;
      }
      var imageUrl = sanitizeHttpUrl(row?.imageUrl);
      if (imageUrl.length == 0) {
        return;
      }
      if (typeof requestType == "string" && requestType.toLowerCase() == "asset") {
        preferredThumbnailByUniverseId.set(universeId, imageUrl);
      } else {
        fallbackThumbnailByUniverseId.set(universeId, imageUrl);
      }
    });
  }

  var resolvedThumbnailByUniverseId = new Map();
  normalizedTargetsByUniverseId.forEach(function (_target, universeId) {
    var preferredThumbnail = preferredThumbnailByUniverseId.get(universeId);
    if (typeof preferredThumbnail == "string" && preferredThumbnail.length > 0) {
      resolvedThumbnailByUniverseId.set(universeId, preferredThumbnail);
      return;
    }
    var fallbackThumbnail = fallbackThumbnailByUniverseId.get(universeId);
    if (typeof fallbackThumbnail == "string" && fallbackThumbnail.length > 0) {
      resolvedThumbnailByUniverseId.set(universeId, fallbackThumbnail);
    }
  });
  return resolvedThumbnailByUniverseId;
}

function fetchUniverseGameIcons(universeIds) {
  var normalizedUniverseIds = Array.from(new Set((Array.isArray(universeIds) ? universeIds : []).map(function (id) {
    return parsePositiveInteger(id);
  }).filter(function (id) {
    return id != null;
  })));
  if (normalizedUniverseIds.length == 0) {
    return Promise.resolve({ data: [] });
  }
  var batchPayload = normalizedUniverseIds.map(function (universeId) {
    return {
      requestId: universeId + "::GameIcon:256x256:webp:regular:",
      type: "GameIcon",
      targetId: universeId,
      token: "",
      format: "webp",
      size: "256x256",
      version: "",
    };
  });
  return fetchRobloxThumbnailBatch(batchPayload);
}

function chunkArray(items, size) {
  var chunks = [];
  if (!Array.isArray(items) || items.length == 0) {
    return chunks;
  }
  for (var i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function sleepMs(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function parsePositiveInteger(value) {
  var parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function normalizeGenreKey(value) {
  if (typeof value != "string") {
    return "";
  }
  return stripTags(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeGenreLabel(value, fallback) {
  if (typeof value != "string") {
    return fallback;
  }
  var trimmed = stripTags(value).trim();
  if (trimmed.length == 0) {
    return fallback;
  }
  return trimmed;
}

function getChartsQueryFilterParam(name, fallback) {
  try {
    var query = new URL(window.location.href).searchParams.get(name);
    if (typeof query != "string") {
      return fallback;
    }
    var normalized = normalizeGenreKey(query);
    return normalized.length > 0 ? normalized : fallback;
  } catch (_) {
    return fallback;
  }
}

function isRoProGenreExplorerMode() {
  return isRoProGenreSyntheticPath();
}

function isRoProGenreSyntheticPath() {
  if (isRoProGenreStandalonePath()) {
    return true;
  }
  if (!isChartsPagePath()) {
    return false;
  }
  try {
    var query = new URL(window.location.href).searchParams.get("roproGenreExplorer");
    return query === "1" || query === "true";
  } catch (_) {
    return false;
  }
}

function getChartsLocalePrefixFromPath() {
  var rawPath = typeof window.location.pathname == "string" ? window.location.pathname : "/";
  var pathSegments = rawPath.split("/");
  if (pathSegments.length > 2) {
    try {
      if (Intl.getCanonicalLocales(pathSegments[1]).length > 0) {
        return "/" + pathSegments[1];
      }
    } catch (_) {}
  }
  return "";
}

function buildRoProGenreExplorerUrl(genreKey, subgenreKey, sortKey) {
  var localePrefix = getChartsLocalePrefixFromPath();
  var nextUrl = new URL(window.location.origin + localePrefix + "/genre-search");
  var defaultDeviceType = normalizeGenreKey($("meta[name='device-meta']").attr("data-device-type")) || "computer";
  nextUrl.searchParams.set("device", getChartsQueryFilterParam("device", defaultDeviceType));
  nextUrl.searchParams.set("country", getChartsQueryFilterParam("country", "all"));
  if (typeof genreKey == "string" && genreKey.length > 0) {
    nextUrl.searchParams.set("roproGenre", genreKey);
  }
  if (typeof subgenreKey == "string" && subgenreKey.length > 0) {
    nextUrl.searchParams.set("roproSubgenre", subgenreKey);
  }
  var normalizedSortKey = normalizeRoProGenreSortKey(sortKey);
  if (normalizedSortKey !== ROPRO_GENRE_SORT_DEFAULT) {
    nextUrl.searchParams.set("roproSort", normalizedSortKey);
  }
  return nextUrl.toString();
}

function isRobloxCharts404Overlay(node) {
  if (node == null || node.nodeType !== 1) {
    return false;
  }
  if (!isRoProGenreSyntheticPath()) {
    return false;
  }
  var text = (node.textContent || "").toLowerCase();
  return text.includes("404") && text.includes("page not found");
}

var roproGenre404PrehideStyleId = "ropro-genre-search-404-prehide-style";
var roproGenre404PrehideTimer = null;
var roproGenre404Observer = null;

function installRoProGenre404Prehide() {
  if (!isRoProGenreSyntheticPath()) {
    return;
  }
  if (document.getElementById(roproGenre404PrehideStyleId) != null) {
    return;
  }
  var prehideStyle = document.createElement("style");
  prehideStyle.id = roproGenre404PrehideStyleId;
  prehideStyle.textContent =
    ".request-error-page-content,.default-error-page{visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}";
  var styleHost = document.head || document.documentElement;
  if (styleHost != null) {
    styleHost.appendChild(prehideStyle);
  }
  if (roproGenre404PrehideTimer != null) {
    clearTimeout(roproGenre404PrehideTimer);
  }
  roproGenre404PrehideTimer = setTimeout(function () {
    removeRoProGenre404Prehide();
  }, 5000);
}

function removeRoProGenre404Prehide() {
  var prehideStyle = document.getElementById(roproGenre404PrehideStyleId);
  if (prehideStyle != null) {
    prehideStyle.remove();
  }
  if (roproGenre404PrehideTimer != null) {
    clearTimeout(roproGenre404PrehideTimer);
    roproGenre404PrehideTimer = null;
  }
}

function dismissRobloxCharts404Overlay() {
  var overlayNode = document.querySelector(".request-error-page-content");
  if (overlayNode == null) {
    return;
  }
  if (!isRobloxCharts404Overlay(overlayNode)) {
    return;
  }
  overlayNode.style.display = "none";
  overlayNode.style.visibility = "hidden";
  overlayNode.style.pointerEvents = "none";
  var errorPage = overlayNode.closest(".default-error-page");
  if (errorPage != null) {
    errorPage.style.display = "none";
    errorPage.style.visibility = "hidden";
    errorPage.style.pointerEvents = "none";
  }
}

function startRoProGenre404Suppression() {
  if (!isRoProGenreSyntheticPath()) {
    return;
  }
  installRoProGenre404Prehide();
  dismissRobloxCharts404Overlay();
  if (roproGenre404Observer != null) {
    return;
  }
  roproGenre404Observer = new MutationObserver(function () {
    dismissRobloxCharts404Overlay();
  });
  if (document.documentElement != null) {
    roproGenre404Observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}

function stopRoProGenre404Suppression() {
  if (roproGenre404Observer != null) {
    roproGenre404Observer.disconnect();
    roproGenre404Observer = null;
  }
  removeRoProGenre404Prehide();
}

if (isRoProGenreSyntheticPath()) {
  startRoProGenre404Suppression();
}

var roproGenreFiltersInitialized = false;
var roproGenreFiltersEnabled = false;
var roproGenreInitInFlight = false;
var roproGenreRefreshTimer = null;
var roproGenreFiltersContainer = null;
var roproGenreSelect = null;
var roproSubgenreSelect = null;
var roproGenreSortSelect = null;
var roproGenreSelectDisplay = null;
var roproSubgenreSelectDisplay = null;
var roproGenreSortSelectDisplay = null;
var roproGenreSearchButton = null;
var roproGenreResultsShell = null;
var roproGenreResultsStatus = null;
var roproGenreResultsGrid = null;
var roproGenreResultsPagination = null;
var roproGenreResultsPagePrevButton = null;
var roproGenreResultsPageNextButton = null;
var roproGenreResultsPageLabel = null;
var roproGenreSyntheticPageContainer = null;
var roproGenreResultsByFilterKey = new Map();
var roproGenreResultsFetchInFlightByFilterKey = new Map();
var roproGenreMoreFetchInFlightByFilterKey = new Map();
var roproSelectedGenreKey = "";
var roproSelectedSubgenreKey = "";
var ROPRO_GENRE_SORT_DEFAULT = "most_players";
var ROPRO_GENRE_SORT_OPTIONS = [
  { value: "most_players", label: "Most Players", statusLabel: "active players (high to low)" },
  { value: "least_players", label: "Least Players", statusLabel: "active players (low to high)" },
  { value: "best_like_ratio", label: "Best Like Ratio", statusLabel: "like ratio (high to low)" },
  { value: "worst_like_ratio", label: "Worst Like Ratio", statusLabel: "like ratio (low to high)" },
];
var ROPRO_GENRE_SORT_KEY_ALIASES = {
  most_favorite_ratio: "best_like_ratio",
  least_favorite_ratio: "worst_like_ratio",
  most_like_ratio: "best_like_ratio",
  least_like_ratio: "worst_like_ratio",
};
var roproSelectedSortKey = ROPRO_GENRE_SORT_DEFAULT;
var roproGenreCurrentPageIndex = 0;
var roproGenreCurrentRenderKey = "";
var roproGenreRenderGeneration = 0;
var roproChartsDeviceFilter = "";
var roproChartsCountryFilter = "";
var roproUniverseGenreMap = new Map();
var roproPlaceGenreMap = new Map();
var roproPlaceExperienceMap = new Map();
var roproGenreOptionsMap = new Map();
var roproSubgenreOptionsByGenreMap = new Map();
var ROPRO_GENRE_SYNTHETIC_PAGE_LIMIT = 30;
var ROPRO_GENRE_SYNTHETIC_EXPERIENCE_LIMIT = 1200;
var ROPRO_GENRE_SYNTHETIC_RENDER_LIMIT = 800;
var ROPRO_GENRE_PAGE_SIZE_BASE = 30;
var ROPRO_GENRE_TARGET_ROWS = 3;
var ROPRO_GENRE_CACHE_FETCH_LIMIT = 100;
var ROPRO_GENRE_PROGRESSIVE_BATCH_SIZE = 100;
var ROPRO_GENRE_CACHE_METADATA_BATCH_SIZE = 50;
var ROPRO_GENRE_THUMBNAIL_BATCH_SIZE = 100;
var ROPRO_GENRE_TAXONOMY = [
  {
    label: "Action",
    subgenres: ["Battlegrounds & Fighting", "Music & Rhythm", "Open World Action"],
  },
  {
    label: "Adventure",
    subgenres: ["Exploration", "Scavenger Hunt", "Story"],
  },
  {
    label: "Education",
    subgenres: [],
  },
  {
    label: "Entertainment",
    subgenres: ["Music & Audio", "Showcase & Hub", "Video"],
  },
  {
    label: "Obby & Platformer",
    subgenres: ["Classic Obby", "Runner", "Tower Obby"],
  },
  {
    label: "Party & Casual",
    subgenres: ["Childhood Game", "Coloring & Drawing", "Minigame", "Quiz"],
  },
  {
    label: "Puzzle",
    subgenres: ["Escape Room", "Match & Merge", "Word"],
  },
  {
    label: "RPG",
    subgenres: ["Action RPG", "Open World & Survival RPG", "Turn-based RPG"],
  },
  {
    label: "Roleplay & Avatar Sim",
    subgenres: ["Animal Sim", "Dress Up", "Life", "Morph Roleplay", "Pet Care"],
  },
  {
    label: "Shooter",
    subgenres: ["Battle Royale", "Deathmatch Shooter", "PvE Shooter"],
  },
  {
    label: "Shopping",
    subgenres: ["Avatar Shopping"],
  },
  {
    label: "Simulation",
    subgenres: ["Idle", "Incremental Simulator", "Physics Sim", "Sandbox", "Tycoon", "Vehicle Sim"],
  },
  {
    label: "Social",
    subgenres: [],
  },
  {
    label: "Sports & Racing",
    subgenres: ["Racing", "Sports"],
  },
  {
    label: "Strategy",
    subgenres: ["Board & Card Games", "Tower Defense"],
  },
  {
    label: "Survival",
    subgenres: ["1 vs All", "Escape"],
  },
  {
    label: "Utility & Other",
    subgenres: [],
  },
];

function findChartsPopularFiltersContainer() {
  var containers = document.querySelectorAll(".filters-container");
  for (var i = 0; i < containers.length; i++) {
    var container = containers[i];
    var headerNode = container.querySelector(".filters-header");
    var headerText = normalizeGenreKey(headerNode?.textContent || "");
    if (
      headerText.indexOf("popular on") >= 0 ||
      container.querySelector(".filter-select") != null
    ) {
      return container;
    }
  }
  return null;
}

function getGenreFiltersAnchor() {
  if (isRoProGenreSyntheticPath()) {
    var syntheticAnchor = document.querySelector(".ropro-genre-synthetic-anchor");
    if (syntheticAnchor != null) {
      return syntheticAnchor;
    }
  }
  var chartsFilters = findChartsPopularFiltersContainer();
  if (chartsFilters != null) {
    return chartsFilters;
  }
  var gamesPageSection = $('.games-page-container').first().find('> .section').first();
  if (gamesPageSection.length == 0) {
    gamesPageSection = $('.games-page-container:first .section:first');
  }
  if (gamesPageSection.length == 0) {
    return null;
  }
  var gamesPageFilters = gamesPageSection.find('> .filters-container').first();
  if (gamesPageFilters.length == 0) {
    gamesPageFilters = gamesPageSection.find('.filters-container:first');
  }
  if (gamesPageFilters.length == 0) {
    return null;
  }
  return gamesPageFilters.get(0);
}

function ensureRoProGenreSyntheticPageMounted() {
  if (!isRoProGenreSyntheticPath()) {
    return false;
  }
  if (roproGenreSyntheticPageContainer != null && document.body.contains(roproGenreSyntheticPageContainer)) {
    dismissRobloxCharts404Overlay();
    stopRoProGenre404Suppression();
    return true;
  }
  var existingPage = document.querySelector(".ropro-genre-synthetic-page");
  if (existingPage != null) {
    roproGenreSyntheticPageContainer = existingPage;
    dismissRobloxCharts404Overlay();
    stopRoProGenre404Suppression();
    return true;
  }

  var mountHost =
    document.querySelector("#container-main .content") ||
    document.querySelector("#container-main") ||
    document.body;
  if (!(mountHost instanceof HTMLElement)) {
    return false;
  }

  var syntheticPage = document.createElement("div");
  syntheticPage.className = "games-page-container ropro-genre-synthetic-page";
  var syntheticSection = document.createElement("div");
  syntheticSection.className = "section";
  var syntheticHeader = document.createElement("div");
  syntheticHeader.className = "games-list-header";
  var title = document.createElement("h1");
  title.className = "ropro-genre-page-title";
  var titleLogo = document.createElement("img");
  titleLogo.className = "ropro-page-heading-logo";
  titleLogo.src = chrome.runtime.getURL("/images/ropro_icon_small.png");
  titleLogo.alt = "";
  titleLogo.setAttribute("aria-hidden", "true");
  var titleText = document.createElement("span");
  titleText.textContent = "RoPro Genre Search";
  title.appendChild(titleLogo);
  title.appendChild(titleText);
  syntheticHeader.appendChild(title);
  var syntheticAnchor = document.createElement("div");
  syntheticAnchor.className = "filters-container ropro-genre-synthetic-anchor";
  syntheticSection.appendChild(syntheticHeader);
  syntheticSection.appendChild(syntheticAnchor);
  syntheticPage.appendChild(syntheticSection);
  mountHost.appendChild(syntheticPage);
  roproGenreSyntheticPageContainer = syntheticPage;
  dismissRobloxCharts404Overlay();
  stopRoProGenre404Suppression();
  return true;
}

function ensureRoProGenreFilterStyles() {
  if (document.getElementById("roproGenreFiltersStyles")) {
    return;
  }
  var style = document.createElement("style");
  style.id = "roproGenreFiltersStyles";
  style.textContent = `
.ropro-genre-filters-container {
  margin-top: 12px;
}
.ropro-genre-filter-items {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.ropro-genre-filter-host {
  position: relative;
  display: inline-flex;
  min-width: 170px;
}
.ropro-genre-synthetic-page {
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 16px;
  padding-right: 16px;
}
.ropro-genre-synthetic-page .games-list-header {
  margin-bottom: 18px;
}
.ropro-genre-page-title {
  display: inline-flex;
  align-items: center;
  gap: 9px;
}
.ropro-genre-header {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.ropro-genre-page-title .ropro-page-heading-logo,
.ropro-genre-header .ropro-page-heading-logo {
  width: 26px;
  height: 26px;
  object-fit: contain;
  flex: 0 0 auto;
}
.ropro-genre-filter-host .filter-select {
  width: 100%;
  justify-content: space-between;
  pointer-events: none;
}
.ropro-genre-filter-native-select {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
.ropro-genre-filter-display-text {
  max-width: 165px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ropro-genre-filter-host[data-disabled="true"] .filter-select {
  opacity: 0.6;
}
.ropro-genre-filter-search-btn {
  min-width: 120px;
}
.ropro-genre-explorer-hidden-native {
  display: none !important;
}
.ropro-genre-results-shell {
  margin-top: 12px;
  margin-bottom: 12px;
  padding: 0;
}
.ropro-genre-results-status {
  margin: 0 0 12px 0;
  font-size: 13px;
  opacity: 0.9;
}
.ropro-genre-results-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ropro-genre-results-list::before,
.ropro-genre-results-list::after {
  display: none !important;
  content: none !important;
}
.ropro-genre-results-list .list-item {
  float: none !important;
  margin: 0 !important;
  width: auto !important;
}
.ropro-genre-results-list .list-item .game-card-link {
  width: 100%;
}
.ropro-genre-results-list .list-item .game-card-thumb-container,
.ropro-genre-results-list .list-item .thumbnail-2d-container {
  width: 100%;
}
.ropro-genre-results-list .list-item .thumbnail-2d-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}
.ropro-genre-results-loader {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  width: 100%;
}
.ropro-genre-pagination {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.ropro-genre-pagination-label {
  font-size: 13px;
  min-width: 100px;
  text-align: center;
  opacity: 0.9;
}
.ropro-genre-pagination[hidden] {
  display: none !important;
}
}`;
  document.head.appendChild(style);
}

function createRoProGenreFilterSelect(id, ariaLabel) {
  var host = document.createElement("div");
  host.className = "ropro-genre-filter-host";
  host.setAttribute("data-disabled", "false");
  var button = document.createElement("button");
  button.type = "button";
  button.className = "filter-select btn-secondary-md btn-min-width";
  button.setAttribute("tabindex", "-1");
  button.setAttribute("aria-hidden", "true");
  var displayText = document.createElement("span");
  displayText.className = "filter-display-text ropro-genre-filter-display-text";
  displayText.textContent = "";
  button.appendChild(displayText);
  var arrow = document.createElement("span");
  arrow.className = "icon-expand-arrow";
  button.appendChild(arrow);
  host.appendChild(button);
  var select = document.createElement("select");
  select.id = id;
  select.className = "ropro-genre-filter-select ropro-genre-filter-native-select";
  select.setAttribute("aria-label", ariaLabel);
  host.appendChild(select);
  return { host: host, select: select, displayText: displayText };
}

function createRoProGenreSearchButton(buttonLabel) {
  var host = document.createElement("div");
  host.className = "ropro-genre-filter-host";
  var button = document.createElement("button");
  button.type = "button";
  button.className = "ropro-genre-filter-search-btn btn-secondary-md btn-min-width";
  button.textContent = buttonLabel;
  host.appendChild(button);
  return { host: host, button: button };
}

function shouldDisableRoProGenreSearchButton() {
  return !isRoProGenreExplorerMode() && roproSelectedGenreKey.length == 0;
}

function updateRoProGenreSearchButtonState() {
  if (roproGenreSearchButton == null) {
    return;
  }
  roproGenreSearchButton.disabled = shouldDisableRoProGenreSearchButton();
}

function shouldDisableRoProGenreSortSelect() {
  return roproSelectedGenreKey.length == 0;
}

function updateRoProGenreSortSelectState() {
  if (roproGenreSortSelect == null) {
    return;
  }
  roproGenreSortSelect.disabled = shouldDisableRoProGenreSortSelect();
}

function createRoProGenrePaginationControls() {
  var host = document.createElement("div");
  host.className = "ropro-genre-pagination";
  host.hidden = true;

  var prevButton = document.createElement("button");
  prevButton.type = "button";
  prevButton.className = "btn-secondary-md btn-min-width ropro-genre-pagination-prev";
  prevButton.textContent = "Previous";
  prevButton.disabled = true;
  prevButton.addEventListener("click", function () {
    if (roproGenreCurrentPageIndex <= 0) {
      return;
    }
    roproGenreCurrentPageIndex--;
    applyRoProGenreFilters();
  });

  var label = document.createElement("span");
  label.className = "ropro-genre-pagination-label";
  label.textContent = "Page 1 of 1";

  var nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "btn-secondary-md btn-min-width ropro-genre-pagination-next";
  nextButton.textContent = "Next";
  nextButton.disabled = true;
  nextButton.addEventListener("click", function () {
    roproGenreCurrentPageIndex++;
    applyRoProGenreFilters();
  });

  host.appendChild(prevButton);
  host.appendChild(label);
  host.appendChild(nextButton);
  return {
    host: host,
    prevButton: prevButton,
    nextButton: nextButton,
    label: label,
  };
}

function assignRoProGenrePaginationReferences(paginationHost) {
  if (!(paginationHost instanceof HTMLElement)) {
    roproGenreResultsPagination = null;
    roproGenreResultsPagePrevButton = null;
    roproGenreResultsPageNextButton = null;
    roproGenreResultsPageLabel = null;
    return;
  }
  roproGenreResultsPagination = paginationHost;
  roproGenreResultsPagePrevButton = paginationHost.querySelector(".ropro-genre-pagination-prev");
  roproGenreResultsPageNextButton = paginationHost.querySelector(".ropro-genre-pagination-next");
  roproGenreResultsPageLabel = paginationHost.querySelector(".ropro-genre-pagination-label");
}

function updateRoProGenrePaginationState(totalRows, totalPages, hasMoreServerData) {
  if (
    roproGenreResultsPagination == null ||
    roproGenreResultsPagePrevButton == null ||
    roproGenreResultsPageNextButton == null ||
    roproGenreResultsPageLabel == null
  ) {
    return;
  }
  if (!Number.isFinite(totalRows) || totalRows <= 0 || !Number.isFinite(totalPages) || totalPages <= 1) {
    if (hasMoreServerData === true) {
      roproGenreResultsPagination.hidden = false;
      roproGenreResultsPageLabel.textContent =
        "Page " + String(roproGenreCurrentPageIndex + 1) + " (more available)";
      roproGenreResultsPagePrevButton.disabled = roproGenreCurrentPageIndex <= 0;
      roproGenreResultsPageNextButton.disabled = false;
      return;
    }
    roproGenreResultsPagination.hidden = true;
    roproGenreResultsPagePrevButton.disabled = true;
    roproGenreResultsPageNextButton.disabled = true;
    roproGenreResultsPageLabel.textContent = "Page 1 of 1";
    return;
  }
  roproGenreResultsPagination.hidden = false;
  var pageLabel = "Page " + String(roproGenreCurrentPageIndex + 1) + " of " + String(totalPages);
  if (hasMoreServerData === true) {
    pageLabel += "+";
  }
  roproGenreResultsPageLabel.textContent = pageLabel;
  roproGenreResultsPagePrevButton.disabled = roproGenreCurrentPageIndex <= 0;
  roproGenreResultsPageNextButton.disabled =
    roproGenreCurrentPageIndex >= totalPages - 1 && hasMoreServerData !== true;
}

function populateSelectOptions(select, options, selectedValue) {
  while (select.firstChild) {
    select.removeChild(select.firstChild);
  }
  options.forEach(function (optionData) {
    var option = document.createElement("option");
    option.value = optionData.value;
    option.textContent = optionData.label;
    if (optionData.disabled === true) {
      option.disabled = true;
    }
    select.appendChild(option);
  });
  if (typeof selectedValue == "string") {
    select.value = selectedValue;
  }
  if (select.selectedIndex < 0 && select.options.length > 0) {
    select.selectedIndex = 0;
  }
}

function updateRoProGenreFilterDisplay(select, displayNode) {
  if (select == null || displayNode == null) {
    return;
  }
  var selectedOption = select.options[select.selectedIndex];
  displayNode.textContent = selectedOption != null ? selectedOption.textContent : "";
  var host = select.closest(".ropro-genre-filter-host");
  if (host != null) {
    host.setAttribute("data-disabled", select.disabled ? "true" : "false");
  }
}

function normalizeRoProGenreSortKey(value) {
  if (typeof value != "string") {
    return ROPRO_GENRE_SORT_DEFAULT;
  }
  var normalized = stripTags(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (Object.prototype.hasOwnProperty.call(ROPRO_GENRE_SORT_KEY_ALIASES, normalized)) {
    normalized = ROPRO_GENRE_SORT_KEY_ALIASES[normalized];
  }
  for (var i = 0; i < ROPRO_GENRE_SORT_OPTIONS.length; i++) {
    if (ROPRO_GENRE_SORT_OPTIONS[i].value == normalized) {
      return normalized;
    }
  }
  return ROPRO_GENRE_SORT_DEFAULT;
}

function getRoProGenreSortOptions() {
  return ROPRO_GENRE_SORT_OPTIONS.map(function (sortOption) {
    return {
      value: sortOption.value,
      label: sortOption.label,
    };
  });
}

function syncRoProGenreSortSelectOptions() {
  if (roproGenreSortSelect == null) {
    return;
  }
  var sortOptions = getRoProGenreSortOptions();
  var hasSelectedSortOption = sortOptions.some(function (sortOption) {
    return sortOption.value == roproSelectedSortKey;
  });
  if (!hasSelectedSortOption) {
    roproSelectedSortKey = sortOptions.length > 0 ? sortOptions[0].value : ROPRO_GENRE_SORT_DEFAULT;
  }
  populateSelectOptions(roproGenreSortSelect, sortOptions, roproSelectedSortKey);
  roproSelectedSortKey = normalizeRoProGenreSortKey(roproGenreSortSelect.value);
}

function getRoProGenreSortStatusLabel(sortKey) {
  var normalizedSortKey = normalizeRoProGenreSortKey(sortKey);
  for (var i = 0; i < ROPRO_GENRE_SORT_OPTIONS.length; i++) {
    if (ROPRO_GENRE_SORT_OPTIONS[i].value == normalizedSortKey) {
      return ROPRO_GENRE_SORT_OPTIONS[i].statusLabel;
    }
  }
  return "active players (high to low)";
}

function readRoProGenreFiltersFromQuery() {
  try {
    var searchParams = new URL(window.location.href).searchParams;
    roproSelectedGenreKey = normalizeGenreKey(searchParams.get("roproGenre"));
    roproSelectedSubgenreKey = normalizeGenreKey(searchParams.get("roproSubgenre"));
    roproSelectedSortKey = normalizeRoProGenreSortKey(searchParams.get("roproSort"));
  } catch (_) {
    roproSelectedGenreKey = "";
    roproSelectedSubgenreKey = "";
    roproSelectedSortKey = ROPRO_GENRE_SORT_DEFAULT;
  }
}

function writeRoProGenreFiltersToQuery() {
  try {
    var nextUrl = new URL(window.location.href);
    if (isChartsPagePath() && isRoProGenreExplorerMode()) {
      nextUrl.searchParams.set("roproGenreExplorer", "1");
    } else {
      nextUrl.searchParams.delete("roproGenreExplorer");
    }
    if (roproSelectedGenreKey.length > 0) {
      nextUrl.searchParams.set("roproGenre", roproSelectedGenreKey);
    } else {
      nextUrl.searchParams.delete("roproGenre");
    }
    if (roproSelectedSubgenreKey.length > 0) {
      nextUrl.searchParams.set("roproSubgenre", roproSelectedSubgenreKey);
    } else {
      nextUrl.searchParams.delete("roproSubgenre");
    }
    if (roproSelectedSortKey !== ROPRO_GENRE_SORT_DEFAULT) {
      nextUrl.searchParams.set("roproSort", roproSelectedSortKey);
    } else {
      nextUrl.searchParams.delete("roproSort");
    }
    window.history.replaceState(window.history.state, "", nextUrl.toString());
  } catch (_) {}
}

function buildRoProGenreOptions() {
  roproGenreOptionsMap.clear();
  roproSubgenreOptionsByGenreMap.clear();
  ROPRO_GENRE_TAXONOMY.forEach(function (genreRow) {
    var genreLabel = normalizeGenreLabel(genreRow?.label, "");
    var genreKey = normalizeGenreKey(genreLabel);
    if (genreKey.length == 0) {
      return;
    }
    roproGenreOptionsMap.set(genreKey, genreLabel);
    roproSubgenreOptionsByGenreMap.set(genreKey, new Map());
    if (!Array.isArray(genreRow?.subgenres)) {
      return;
    }
    genreRow.subgenres.forEach(function (subgenreLabelRaw) {
      var subgenreLabel = normalizeGenreLabel(subgenreLabelRaw, "");
      var subgenreKey = normalizeGenreKey(subgenreLabel);
      if (subgenreKey.length == 0) {
        return;
      }
      roproSubgenreOptionsByGenreMap.get(genreKey).set(subgenreKey, subgenreLabel);
    });
  });
  roproPlaceGenreMap.forEach(function (genreData) {
    if (genreData == null || genreData.genreKey.length == 0) {
      return;
    }
    if (!roproGenreOptionsMap.has(genreData.genreKey)) {
      roproGenreOptionsMap.set(genreData.genreKey, genreData.genreLabel);
    }
    if (!roproSubgenreOptionsByGenreMap.has(genreData.genreKey)) {
      roproSubgenreOptionsByGenreMap.set(genreData.genreKey, new Map());
    }
    if (genreData.subgenreKey.length > 0) {
      roproSubgenreOptionsByGenreMap.get(genreData.genreKey).set(genreData.subgenreKey, genreData.subgenreLabel);
    }
  });
}

function getAllRoProSubgenreOptions() {
  var allSubgenres = new Map();
  roproSubgenreOptionsByGenreMap.forEach(function (subgenreMap) {
    subgenreMap.forEach(function (label, key) {
      allSubgenres.set(key, label);
    });
  });
  return allSubgenres;
}

function updateRoProSubgenreFilterVisibility() {
  if (roproSubgenreSelect == null) {
    return;
  }
  var subgenreHost = roproSubgenreSelect.closest(".ropro-genre-filter-host");
  if (!(subgenreHost instanceof HTMLElement)) {
    return;
  }
  var hasSelectedGenre = roproSelectedGenreKey.length > 0;
  subgenreHost.hidden = !hasSelectedGenre;
}

function refreshRoProGenreSelects() {
  if (roproGenreSelect == null || roproSubgenreSelect == null) {
    return;
  }
  roproSelectedSortKey = normalizeRoProGenreSortKey(roproSelectedSortKey);
  if (roproSelectedGenreKey.length == 0 && roproSelectedSubgenreKey.length > 0) {
    roproSelectedSubgenreKey = "";
  }
  buildRoProGenreOptions();
  var sortedGenres = Array.from(roproGenreOptionsMap.entries()).sort(function (left, right) {
    return left[1].localeCompare(right[1]);
  });
  var genreOptions = [{ value: "", label: "All Genres" }];
  sortedGenres.forEach(function (entry) {
    genreOptions.push({ value: entry[0], label: entry[1] });
  });
  if (roproSelectedGenreKey.length > 0 && !roproGenreOptionsMap.has(roproSelectedGenreKey)) {
    roproSelectedGenreKey = "";
  }
  populateSelectOptions(roproGenreSelect, genreOptions, roproSelectedGenreKey);

  var hasSelectedGenre = roproSelectedGenreKey.length > 0;
  var subgenreSource = hasSelectedGenre
    ? roproSubgenreOptionsByGenreMap.get(roproSelectedGenreKey) || new Map()
    : new Map();
  var subgenreOptions = [];
  if (hasSelectedGenre) {
    var sortedSubgenres = Array.from(subgenreSource.entries()).sort(function (left, right) {
      return left[1].localeCompare(right[1]);
    });
    subgenreOptions.push({ value: "", label: "All Subgenres" });
    sortedSubgenres.forEach(function (entry) {
      subgenreOptions.push({ value: entry[0], label: entry[1] });
    });
  } else {
    subgenreOptions.push({ value: "", label: "Select Genre First", disabled: true });
  }
  if (hasSelectedGenre && roproSelectedSubgenreKey.length > 0 && !subgenreSource.has(roproSelectedSubgenreKey)) {
    roproSelectedSubgenreKey = "";
  } else if (!hasSelectedGenre) {
    roproSelectedSubgenreKey = "";
  }
  populateSelectOptions(roproSubgenreSelect, subgenreOptions, roproSelectedSubgenreKey);

  var hasGenreData = roproGenreOptionsMap.size > 0;
  roproGenreSelect.disabled = false;
  roproSubgenreSelect.disabled = !hasSelectedGenre;
  if (roproGenreSortSelect != null) {
    syncRoProGenreSortSelectOptions();
    updateRoProGenreSortSelectState();
  }
  updateRoProSubgenreFilterVisibility();
  updateRoProGenreFilterDisplay(roproGenreSelect, roproGenreSelectDisplay);
  updateRoProGenreFilterDisplay(roproSubgenreSelect, roproSubgenreSelectDisplay);
  updateRoProGenreFilterDisplay(roproGenreSortSelect, roproGenreSortSelectDisplay);
  updateRoProGenreSearchButtonState();
  setRoProGenreDebugAttribute("data-ropro-genre-filters-data-state", hasGenreData ? "ready" : "empty");
}

function setRoProGenreSelectsLoading() {
  if (roproGenreSelect == null || roproSubgenreSelect == null) {
    return;
  }
  if (roproSelectedGenreKey.length == 0 && roproSelectedSubgenreKey.length > 0) {
    roproSelectedSubgenreKey = "";
  }
  var hasSelectedGenre = roproSelectedGenreKey.length > 0;
  populateSelectOptions(roproGenreSelect, [{ value: "", label: "Loading Genres...", disabled: true }], "");
  populateSelectOptions(
    roproSubgenreSelect,
    [
      {
        value: "",
        label: hasSelectedGenre ? "Loading Subgenres..." : "Select Genre First",
        disabled: true,
      },
    ],
    ""
  );
  roproGenreSelect.disabled = true;
  roproSubgenreSelect.disabled = true;
  if (roproGenreSortSelect != null) {
    syncRoProGenreSortSelectOptions();
    updateRoProGenreSortSelectState();
  }
  updateRoProSubgenreFilterVisibility();
  updateRoProGenreFilterDisplay(roproGenreSelect, roproGenreSelectDisplay);
  updateRoProGenreFilterDisplay(roproSubgenreSelect, roproSubgenreSelectDisplay);
  updateRoProGenreFilterDisplay(roproGenreSortSelect, roproGenreSortSelectDisplay);
  updateRoProGenreSearchButtonState();
  setRoProGenreDebugAttribute("data-ropro-genre-filters-data-state", "loading");
}

function createRoProGenreFiltersContainer() {
  var syntheticPath = isRoProGenreSyntheticPath();
  var container = document.createElement("div");
  container.className = "filters-container ropro-genre-filters-container";
  container.setAttribute("data-ropro-genre-filters", "true");

  if (!syntheticPath) {
    var headerContainer = document.createElement("div");
    headerContainer.className = "filters-header-container";
    var header = document.createElement("span");
    header.className = "filters-header ropro-genre-header";
    var headerLogo = document.createElement("img");
    headerLogo.className = "ropro-page-heading-logo";
    headerLogo.src = chrome.runtime.getURL("/images/ropro_icon_small.png");
    headerLogo.alt = "";
    headerLogo.setAttribute("aria-hidden", "true");
    var headerText = document.createElement("span");
    headerText.textContent = "RoPro Genre Search:";
    header.appendChild(headerLogo);
    header.appendChild(headerText);
    headerContainer.appendChild(header);
    container.appendChild(headerContainer);
  }

  var items = document.createElement("div");
  items.className = "filter-items-container ropro-genre-filter-items";

  var genreSelectData = createRoProGenreFilterSelect("roproGenreFilter", "RoPro genre filter");
  roproGenreSelect = genreSelectData.select;
  roproGenreSelectDisplay = genreSelectData.displayText;
  items.appendChild(genreSelectData.host);

  var subgenreSelectData = createRoProGenreFilterSelect("roproSubgenreFilter", "RoPro subgenre filter");
  roproSubgenreSelect = subgenreSelectData.select;
  roproSubgenreSelectDisplay = subgenreSelectData.displayText;
  items.appendChild(subgenreSelectData.host);

  var sortSelectData = createRoProGenreFilterSelect("roproGenreSortFilter", "RoPro genre sort");
  roproGenreSortSelect = sortSelectData.select;
  roproGenreSortSelectDisplay = sortSelectData.displayText;
  syncRoProGenreSortSelectOptions();
  updateRoProGenreSortSelectState();
  updateRoProGenreFilterDisplay(roproGenreSortSelect, roproGenreSortSelectDisplay);
  items.appendChild(sortSelectData.host);

  var searchButtonData = createRoProGenreSearchButton("Search");
  roproGenreSearchButton = searchButtonData.button;
  updateRoProGenreSearchButtonState();
  items.appendChild(searchButtonData.host);

  roproGenreSelect.addEventListener("change", function (event) {
    roproSelectedGenreKey = normalizeGenreKey(event.target.value);
    roproSelectedSubgenreKey = "";
    refreshRoProGenreSelects();
    if (isRoProGenreExplorerMode()) {
      writeRoProGenreFiltersToQuery();
      applyRoProGenreFilters();
    }
  });
  roproSubgenreSelect.addEventListener("change", function (event) {
    roproSelectedSubgenreKey = normalizeGenreKey(event.target.value);
    updateRoProGenreFilterDisplay(roproSubgenreSelect, roproSubgenreSelectDisplay);
    if (isRoProGenreExplorerMode()) {
      writeRoProGenreFiltersToQuery();
      applyRoProGenreFilters();
    }
  });
  roproGenreSortSelect.addEventListener("change", function (event) {
    roproSelectedSortKey = normalizeRoProGenreSortKey(event.target.value);
    updateRoProGenreFilterDisplay(roproGenreSortSelect, roproGenreSortSelectDisplay);
    if (isRoProGenreExplorerMode()) {
      writeRoProGenreFiltersToQuery();
      applyRoProGenreFilters();
    }
  });
  roproGenreSearchButton.addEventListener("click", function () {
    if (shouldDisableRoProGenreSearchButton()) {
      return;
    }
    if (isRoProGenreExplorerMode()) {
      writeRoProGenreFiltersToQuery();
      applyRoProGenreFilters();
      return;
    }
    window.location.assign(
      buildRoProGenreExplorerUrl(roproSelectedGenreKey, roproSelectedSubgenreKey, roproSelectedSortKey)
    );
  });

  container.appendChild(items);
  updateRoProSubgenreFilterVisibility();
  return container;
}

function ensureRoProGenreFiltersMounted() {
  if (!isRoProGenreSupportedPath()) {
    return false;
  }
  var anchor = getGenreFiltersAnchor();
  if (anchor == null) {
    setRoProGenreDebugAttribute("data-ropro-genre-filters-skip-reason", "waiting-for-anchor");
    return false;
  }
  if (roproGenreFiltersContainer != null && document.body.contains(roproGenreFiltersContainer)) {
    setRoProGenreDebugAttribute("data-ropro-genre-filters-mounted", "true");
    setRoProGenreDebugAttribute("data-ropro-genre-filters-skip-reason", "");
    return true;
  }
  var existingContainer = document.querySelector(".ropro-genre-filters-container");
  if (existingContainer != null) {
    roproGenreFiltersContainer = existingContainer;
    roproGenreSelect = existingContainer.querySelector("#roproGenreFilter");
    roproSubgenreSelect = existingContainer.querySelector("#roproSubgenreFilter");
    roproGenreSortSelect = existingContainer.querySelector("#roproGenreSortFilter");
    roproGenreSelectDisplay = roproGenreSelect
      ?.closest(".ropro-genre-filter-host")
      ?.querySelector(".ropro-genre-filter-display-text");
    roproSubgenreSelectDisplay = roproSubgenreSelect
      ?.closest(".ropro-genre-filter-host")
      ?.querySelector(".ropro-genre-filter-display-text");
    roproGenreSortSelectDisplay = roproGenreSortSelect
      ?.closest(".ropro-genre-filter-host")
      ?.querySelector(".ropro-genre-filter-display-text");
    roproGenreSearchButton = existingContainer.querySelector(".ropro-genre-filter-search-btn");
    var hasRequiredSelects =
      roproGenreSelect != null &&
      roproSubgenreSelect != null &&
      roproGenreSortSelect != null &&
      roproGenreSearchButton != null;
    if (hasRequiredSelects) {
      updateRoProGenreSortSelectState();
      updateRoProGenreSearchButtonState();
      setRoProGenreDebugAttribute("data-ropro-genre-filters-mounted", "true");
      setRoProGenreDebugAttribute("data-ropro-genre-filters-skip-reason", "");
      return true;
    }
    existingContainer.remove();
    roproGenreFiltersContainer = null;
  }
  roproGenreFiltersContainer = createRoProGenreFiltersContainer();
  anchor.insertAdjacentElement("afterend", roproGenreFiltersContainer);
  setRoProGenreDebugAttribute("data-ropro-genre-filters-mounted", "true");
  setRoProGenreDebugAttribute("data-ropro-genre-filters-skip-reason", "");
  setRoProGenreSelectsLoading();
  return true;
}

function toggleRoProChartsNativeRowsForExplorer(shouldHide) {
  var rows = document.querySelectorAll(
    ".game-sort-detail-container, [data-testid='game-grid'], .games-page-container .games-list-container, .games-page-container .games-list-header"
  );
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!(row instanceof HTMLElement)) {
      continue;
    }
    if (
      row.classList.contains("ropro-genre-synthetic-page") ||
      row.closest(".ropro-genre-synthetic-page") != null ||
      row.classList.contains("ropro-genre-filters-container") ||
      row.closest(".ropro-genre-filters-container") != null ||
      row.classList.contains("ropro-genre-results-shell") ||
      row.closest(".ropro-genre-results-shell") != null
    ) {
      continue;
    }
    row.classList.toggle("ropro-genre-explorer-hidden-native", shouldHide);
  }
}

function ensureRoProGenreResultsShellMounted() {
  if (!isRoProGenreExplorerMode()) {
    toggleRoProChartsNativeRowsForExplorer(false);
    return false;
  }
  var shouldHideNativeRows = isRoProGenreSyntheticPath();
  var anchor = roproGenreFiltersContainer;
  if (!(anchor instanceof HTMLElement)) {
    anchor = getGenreFiltersAnchor();
  }
  if (!(anchor instanceof HTMLElement)) {
    return false;
  }
  if (roproGenreResultsShell != null && document.body.contains(roproGenreResultsShell)) {
    toggleRoProChartsNativeRowsForExplorer(shouldHideNativeRows);
    if (roproGenreResultsPagination == null || !roproGenreResultsShell.contains(roproGenreResultsPagination)) {
      var shellPagination = roproGenreResultsShell.querySelector(".ropro-genre-pagination");
      if (!(shellPagination instanceof HTMLElement)) {
        var paginationControls = createRoProGenrePaginationControls();
        roproGenreResultsShell.appendChild(paginationControls.host);
        shellPagination = paginationControls.host;
      }
      assignRoProGenrePaginationReferences(shellPagination);
    }
    return true;
  }
  var existingShell = document.querySelector(".ropro-genre-results-shell");
  if (existingShell != null) {
    roproGenreResultsShell = existingShell;
    roproGenreResultsStatus = existingShell.querySelector(".ropro-genre-results-status");
    roproGenreResultsGrid =
      existingShell.querySelector(".ropro-genre-results-list") ||
      existingShell.querySelector(".ropro-genre-results-grid");
    if (roproGenreResultsStatus == null) {
      roproGenreResultsStatus = document.createElement("p");
      roproGenreResultsStatus.className = "ropro-genre-results-status";
      roproGenreResultsStatus.textContent = "Loading genre results...";
      existingShell.insertAdjacentElement("afterbegin", roproGenreResultsStatus);
    }
    if (roproGenreResultsGrid == null) {
      roproGenreResultsGrid = document.createElement("ul");
      roproGenreResultsGrid.className =
        "hlist games game-cards game-tile-list games-page-carousel ropro-genre-results-list";
      existingShell.appendChild(roproGenreResultsGrid);
    }
    var existingPagination = existingShell.querySelector(".ropro-genre-pagination");
    if (!(existingPagination instanceof HTMLElement)) {
      var existingPaginationControls = createRoProGenrePaginationControls();
      existingShell.appendChild(existingPaginationControls.host);
      existingPagination = existingPaginationControls.host;
    }
    assignRoProGenrePaginationReferences(existingPagination);
    toggleRoProChartsNativeRowsForExplorer(shouldHideNativeRows);
    return roproGenreResultsStatus != null && roproGenreResultsGrid != null;
  }
  var shell = document.createElement("div");
  shell.className = "games-list-container ropro-genre-results-shell";

  var statusNode = document.createElement("p");
  statusNode.className = "ropro-genre-results-status";
  statusNode.textContent = "Loading genre results...";

  var gridNode = document.createElement("ul");
  gridNode.className = "hlist games game-cards game-tile-list games-page-carousel ropro-genre-results-list";

  var paginationControls = createRoProGenrePaginationControls();

  shell.appendChild(statusNode);
  shell.appendChild(gridNode);
  shell.appendChild(paginationControls.host);
  anchor.insertAdjacentElement("afterend", shell);

  roproGenreResultsShell = shell;
  roproGenreResultsStatus = statusNode;
  roproGenreResultsGrid = gridNode;
  assignRoProGenrePaginationReferences(paginationControls.host);
  toggleRoProChartsNativeRowsForExplorer(shouldHideNativeRows);
  return true;
}

function createRoProGenreResultCardNode(experienceData) {
  var placeId = parseInt(experienceData.placeId, 10);
  var universeId = parseInt(experienceData.universeId, 10);
  if (!Number.isFinite(placeId) || placeId <= 0) {
    return null;
  }
  var safeName = normalizeGenreLabel(experienceData.name, "Experience");
  var safeThumbnail = sanitizeHttpUrl(experienceData.thumbnail);
  var safeLikes = parseInt(experienceData.likes, 10);
  var safePlaying = parseInt(experienceData.active, 10);
  if (!Number.isFinite(safeLikes) || safeLikes < 0) {
    safeLikes = 0;
  }
  if (!Number.isFinite(safePlaying) || safePlaying < 0) {
    safePlaying = 0;
  }

  var cardHost = document.createElement("li");
  cardHost.className = "list-item game-card game-tile ropro-genre-results-card-host";

  var cardContainer = document.createElement("div");
  cardContainer.className = "game-card-container";
  cardContainer.setAttribute("data-testid", "game-tile");
  cardHost.appendChild(cardContainer);

  var link = document.createElement("a");
  link.className = "game-card-link";
  link.href = "https://www.roblox.com/games/" + placeId;
  link.setAttribute("tabindex", "0");
  if (Number.isFinite(universeId) && universeId > 0) {
    link.id = String(universeId);
  }
  cardContainer.appendChild(link);

  var thumbContainer = document.createElement("div");
  thumbContainer.className = "game-card-thumb-container";

  var thumbSpan = document.createElement("span");
  thumbSpan.className = "thumbnail-2d-container game-card-thumb";
  var thumbImg = document.createElement("img");
  thumbImg.alt = safeName;
  thumbImg.title = safeName;
  if (safeThumbnail.length > 0) {
    thumbImg.src = safeThumbnail;
  }
  thumbSpan.appendChild(thumbImg);
  thumbContainer.appendChild(thumbSpan);

  var nameNode = document.createElement("div");
  nameNode.className = "game-card-name game-name-title";
  nameNode.title = safeName;
  nameNode.textContent = safeName;

  var infoNode = document.createElement("div");
  infoNode.className = "game-card-info";
  infoNode.setAttribute("data-testid", "game-tile-stats");

  var likesIcon = document.createElement("span");
  likesIcon.className = "info-label icon-votes-gray";
  var likesLabel = document.createElement("span");
  likesLabel.className = "info-label vote-percentage-label";
  likesLabel.textContent = String(safeLikes) + "%";

  var playingIcon = document.createElement("span");
  playingIcon.className = "info-label icon-playing-counts-gray";
  var playingLabel = document.createElement("span");
  playingLabel.className = "info-label playing-counts-label";
  playingLabel.textContent = kFormatter(safePlaying);

  infoNode.appendChild(likesIcon);
  infoNode.appendChild(likesLabel);
  infoNode.appendChild(playingIcon);
  infoNode.appendChild(playingLabel);

  link.appendChild(thumbContainer);
  link.appendChild(nameNode);
  link.appendChild(infoNode);
  return cardHost;
}

function getRoProSelectedGenreLabel() {
  if (roproSelectedGenreKey.length == 0) {
    return "";
  }
  if (roproGenreOptionsMap.has(roproSelectedGenreKey)) {
    return roproGenreOptionsMap.get(roproSelectedGenreKey);
  }
  return roproSelectedGenreKey;
}

function getRoProSelectedSubgenreLabel() {
  if (roproSelectedSubgenreKey.length == 0) {
    return "";
  }
  if (
    roproSelectedGenreKey.length > 0 &&
    roproSubgenreOptionsByGenreMap.has(roproSelectedGenreKey) &&
    roproSubgenreOptionsByGenreMap.get(roproSelectedGenreKey).has(roproSelectedSubgenreKey)
  ) {
    return roproSubgenreOptionsByGenreMap.get(roproSelectedGenreKey).get(roproSelectedSubgenreKey);
  }
  var allSubgenres = getAllRoProSubgenreOptions();
  if (allSubgenres.has(roproSelectedSubgenreKey)) {
    return allSubgenres.get(roproSelectedSubgenreKey);
  }
  return roproSelectedSubgenreKey;
}

function getRoProGenreResultsFilterKey(genreLabel, subgenreLabel, sortKey) {
  var key = normalizeGenreKey(genreLabel) + "|" + normalizeGenreKey(subgenreLabel);
  if (typeof sortKey === "string" && sortKey.length > 0) {
    key += "|" + sortKey;
  }
  return key;
}

function getRoProGenreLikeRatio(experienceData) {
  var votePercent = parseInt(experienceData?.likes, 10);
  if (Number.isFinite(votePercent)) {
    votePercent = Math.max(0, Math.min(100, votePercent));
    return votePercent / 100;
  }
  var upVotes = parseInt(experienceData?.upVotes, 10);
  var downVotes = parseInt(experienceData?.downVotes, 10);
  if (!Number.isFinite(upVotes) || upVotes < 0) {
    upVotes = 0;
  }
  if (!Number.isFinite(downVotes) || downVotes < 0) {
    downVotes = 0;
  }
  var totalVotes = upVotes + downVotes;
  if (totalVotes <= 0) {
    return 0;
  }
  return upVotes / totalVotes;
}

function compareRoProGenreRows(left, right, sortKey) {
  var normalizedSortKey = normalizeRoProGenreSortKey(sortKey);
  var leftActive = parseInt(left?.active, 10);
  var rightActive = parseInt(right?.active, 10);
  if (!Number.isFinite(leftActive) || leftActive < 0) {
    leftActive = 0;
  }
  if (!Number.isFinite(rightActive) || rightActive < 0) {
    rightActive = 0;
  }
  if (normalizedSortKey == "least_players") {
    if (leftActive != rightActive) {
      return leftActive - rightActive;
    }
  } else if (normalizedSortKey == "best_like_ratio" || normalizedSortKey == "worst_like_ratio") {
    var leftLikeRatio = getRoProGenreLikeRatio(left);
    var rightLikeRatio = getRoProGenreLikeRatio(right);
    if (leftLikeRatio != rightLikeRatio) {
      if (normalizedSortKey == "best_like_ratio") {
        return rightLikeRatio - leftLikeRatio;
      }
      return leftLikeRatio - rightLikeRatio;
    }
    if (leftActive != rightActive) {
      return rightActive - leftActive;
    }
  } else if (leftActive != rightActive) {
    return rightActive - leftActive;
  }
  var leftName = normalizeGenreLabel(left?.name, "Experience");
  var rightName = normalizeGenreLabel(right?.name, "Experience");
  return leftName.localeCompare(rightName);
}

function normalizeCachedGenreRows(responsePayload, options) {
  var rows = Array.isArray(responsePayload?.data) ? responsePayload.data : [];
  var normalizedRows = [];
  if (!(options != null && options.incremental === true)) {
    roproPlaceExperienceMap.clear();
    roproPlaceGenreMap.clear();
  }
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (row == null || typeof row != "object") {
      continue;
    }
    var universeId = parsePositiveInteger(row.id || row.universeId || row.universeid);
    var placeId = parsePositiveInteger(row.rootPlaceId || row.rootplaceid || row.placeId || row.placeid);
    if (universeId == null || placeId == null) {
      continue;
    }
    var safeName = normalizeGenreLabel(row.name, "Experience");
    var playing = parseInt(row.playing, 10);
    if (!Number.isFinite(playing) || playing < 0) {
      playing = 0;
    }
    var visits = parseInt(row.visits, 10);
    if (!Number.isFinite(visits) || visits < 0) {
      visits = 0;
    }
    var favoritedCount = parseInt(row.favoritedCount, 10);
    if (!Number.isFinite(favoritedCount) || favoritedCount < 0) {
      favoritedCount = 0;
    }
    var upVotes = parseInt(row.upVotes, 10);
    if (!Number.isFinite(upVotes) || upVotes < 0) {
      upVotes = 0;
    }
    var downVotes = parseInt(row.downVotes, 10);
    if (!Number.isFinite(downVotes) || downVotes < 0) {
      downVotes = 0;
    }
    var votePercent = parseInt(row.votePercent, 10);
    if (!Number.isFinite(votePercent) || votePercent < 0) {
      var totalVotes = upVotes + downVotes;
      votePercent = totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 0;
    }
    votePercent = Math.max(0, Math.min(100, votePercent));
    var genreLabel = normalizeGenreLabel(row.genre_l1 || row.genre, "");
    var subgenreLabel = normalizeGenreLabel(row.genre_l2, "");
    var genreKey = normalizeGenreKey(genreLabel);
    var subgenreKey = normalizeGenreKey(subgenreLabel);
    var thumbnailUrl = sanitizeHttpUrl(row.thumbnail || row.imageUrl || "");
    var normalizedRow = {
      placeId: placeId,
      universeId: universeId,
      name: safeName,
      thumbnail: thumbnailUrl,
      likes: votePercent,
      active: playing,
      visits: visits,
      favoritedCount: favoritedCount,
      genreLabel: genreLabel,
      subgenreLabel: subgenreLabel,
    };
    normalizedRows.push(normalizedRow);
    roproPlaceExperienceMap.set(placeId, normalizedRow);
    roproPlaceGenreMap.set(placeId, {
      genreKey: genreKey,
      genreLabel: genreLabel,
      subgenreKey: subgenreKey,
      subgenreLabel: subgenreLabel,
    });
  }
  return normalizedRows;
}

async function hydrateRoProGenreExperienceMetadata(universeIds, targetExperienceRows) {
  var uniqueUniverseIds = Array.from(
    new Set(
      (Array.isArray(universeIds) ? universeIds : [])
        .map(function (id) {
          return parsePositiveInteger(id);
        })
        .filter(function (id) {
          return id != null;
        })
    )
  );
  if (uniqueUniverseIds.length == 0) {
    return;
  }
  var metadataByUniverseId = new Map();
  var limitedUniverseIds = uniqueUniverseIds.slice(0, ROPRO_GENRE_SYNTHETIC_RENDER_LIMIT);
  var batches = chunkArray(limitedUniverseIds, ROPRO_GENRE_CACHE_METADATA_BATCH_SIZE);
  for (var i = 0; i < batches.length; i++) {
    var batch = batches[i];
    try {
      var response = await fetchUniverseGenres(batch);
      if (Array.isArray(response?.data)) {
        response.data.forEach(function (gameData) {
          var universeId = parsePositiveInteger(gameData?.id);
          if (universeId == null) {
            return;
          }
          var name = normalizeGenreLabel(gameData?.name, "");
          var playing = parseInt(gameData?.playing, 10);
          if (!Number.isFinite(playing) || playing < 0) {
            playing = null;
          }
          var genreLabel = normalizeGenreLabel(gameData?.genre_l1 || gameData?.genre, "");
          var subgenreLabel = normalizeGenreLabel(gameData?.genre_l2, "");
          metadataByUniverseId.set(universeId, {
            name: name,
            active: playing,
            genreLabel: genreLabel,
            subgenreLabel: subgenreLabel,
          });
        });
      }
    } catch (_) {}
    if (i < batches.length - 1) {
      await sleepMs(100);
    }
  }
  if (metadataByUniverseId.size == 0) {
    return;
  }
  (Array.isArray(targetExperienceRows) ? targetExperienceRows : []).forEach(function (experienceData) {
    if (experienceData == null || typeof experienceData != "object") {
      return;
    }
    var universeId = parsePositiveInteger(experienceData.universeId);
    if (universeId == null || !metadataByUniverseId.has(universeId)) {
      return;
    }
    var metadata = metadataByUniverseId.get(universeId);
    if (typeof metadata?.name == "string" && metadata.name.length > 0) {
      experienceData.name = metadata.name;
    }
    if (Number.isFinite(metadata?.active) && metadata.active >= 0) {
      experienceData.active = metadata.active;
    }
    if (typeof metadata?.genreLabel == "string" && metadata.genreLabel.length > 0) {
      experienceData.genreLabel = metadata.genreLabel;
    }
    if (typeof metadata?.subgenreLabel == "string" && metadata.subgenreLabel.length > 0) {
      experienceData.subgenreLabel = metadata.subgenreLabel;
    }
    var genreKey = normalizeGenreKey(experienceData.genreLabel);
    var subgenreKey = normalizeGenreKey(experienceData.subgenreLabel);
    roproPlaceGenreMap.set(experienceData.placeId, {
      genreKey: genreKey,
      genreLabel: experienceData.genreLabel,
      subgenreKey: subgenreKey,
      subgenreLabel: experienceData.subgenreLabel,
    });
    roproPlaceExperienceMap.set(experienceData.placeId, experienceData);
    roproUniverseGenreMap.set(universeId, {
      genreKey: genreKey,
      genreLabel: experienceData.genreLabel,
      subgenreKey: subgenreKey,
      subgenreLabel: experienceData.subgenreLabel,
      playing: Number.isFinite(experienceData.active) ? experienceData.active : 0,
      name: experienceData.name,
      rootPlaceId: parsePositiveInteger(experienceData.placeId) || 0,
    });
  });
}

async function loadRoProGenreResultsFromCache(sortKey) {
  var genreLabel = getRoProSelectedGenreLabel();
  if (genreLabel.length == 0) {
    setRoProGenreDebugAttribute("data-ropro-genre-filters-fetch-state", "waiting-for-selection");
    return { rows: [], totalCount: 0, loadedCount: 0 };
  }
  var subgenreLabel = getRoProSelectedSubgenreLabel();
  var effectiveSortKey = typeof sortKey === "string" && sortKey.length > 0 ? sortKey : ROPRO_GENRE_SORT_DEFAULT;
  var filterKey = getRoProGenreResultsFilterKey(genreLabel, subgenreLabel, effectiveSortKey);
  if (roproGenreResultsByFilterKey.has(filterKey)) {
    return roproGenreResultsByFilterKey.get(filterKey);
  }
  if (roproGenreResultsFetchInFlightByFilterKey.has(filterKey)) {
    return await roproGenreResultsFetchInFlightByFilterKey.get(filterKey);
  }
  setRoProGenreDebugAttribute("data-ropro-genre-filters-fetch-state", "loading-cached");
  var fetchPromise = fetchCachedGenreGames({
    genre: genreLabel,
    subgenre: subgenreLabel,
    limit: ROPRO_GENRE_CACHE_FETCH_LIMIT,
    offset: 0,
    sort: effectiveSortKey,
  })
    .then(async function (responsePayload) {
      var emptyEntry = { rows: [], totalCount: 0, loadedCount: 0 };
      if (responsePayload == null || typeof responsePayload != "object") {
        return emptyEntry;
      }
      if (responsePayload.error === "genre_required") {
        return emptyEntry;
      }
      var totalCount = parseInt(responsePayload.totalCount, 10);
      if (!Number.isFinite(totalCount) || totalCount < 0) {
        totalCount = 0;
      }
      var normalizedRows = normalizeCachedGenreRows(responsePayload);
      if (normalizedRows.length == 0) {
        return { rows: normalizedRows, totalCount: totalCount, loadedCount: 0 };
      }
      var metadataUniverseIds = normalizedRows.map(function (row) {
        return parsePositiveInteger(row?.universeId);
      }).filter(function (universeId) {
        return universeId != null;
      });
      if (metadataUniverseIds.length > 0) {
        setRoProGenreDebugAttribute("data-ropro-genre-filters-fetch-state", "loading-metadata");
        await hydrateRoProGenreExperienceMetadata(metadataUniverseIds, normalizedRows);
      }
      var missingThumbnailUniverseIds = [];
      normalizedRows.forEach(function (row) {
        if (sanitizeHttpUrl(row?.thumbnail).length > 0) {
          return;
        }
        var universeId = parsePositiveInteger(row?.universeId);
        if (universeId != null) {
          missingThumbnailUniverseIds.push(universeId);
        }
      });
      if (missingThumbnailUniverseIds.length > 0) {
        setRoProGenreDebugAttribute("data-ropro-genre-filters-fetch-state", "loading-thumbnails");
        await hydrateRoProGenreExperienceThumbnails(missingThumbnailUniverseIds, normalizedRows);
      }
      return { rows: normalizedRows, totalCount: totalCount, loadedCount: normalizedRows.length };
    })
    .catch(function () {
      return { rows: [], totalCount: 0, loadedCount: 0 };
    })
    .finally(function () {
      roproGenreResultsFetchInFlightByFilterKey.delete(filterKey);
    });
  roproGenreResultsFetchInFlightByFilterKey.set(filterKey, fetchPromise);
  var cacheEntry = await fetchPromise;
  roproGenreResultsByFilterKey.set(filterKey, cacheEntry);
  return cacheEntry;
}

async function loadMoreRoProGenreResults(filterKey, sortKey) {
  if (!roproGenreResultsByFilterKey.has(filterKey)) {
    return null;
  }
  var cacheEntry = roproGenreResultsByFilterKey.get(filterKey);
  if (cacheEntry.loadedCount >= cacheEntry.totalCount || cacheEntry.loadedCount >= ROPRO_GENRE_SYNTHETIC_RENDER_LIMIT) {
    return cacheEntry;
  }
  if (roproGenreMoreFetchInFlightByFilterKey.has(filterKey)) {
    return await roproGenreMoreFetchInFlightByFilterKey.get(filterKey);
  }
  var genreLabel = getRoProSelectedGenreLabel();
  var subgenreLabel = getRoProSelectedSubgenreLabel();
  var currentOffset = cacheEntry.loadedCount;
  var effectiveSortKey = typeof sortKey === "string" && sortKey.length > 0 ? sortKey : ROPRO_GENRE_SORT_DEFAULT;
  setRoProGenreDebugAttribute("data-ropro-genre-filters-fetch-state", "loading-more");
  var fetchPromise = fetchCachedGenreGames({
    genre: genreLabel,
    subgenre: subgenreLabel,
    limit: ROPRO_GENRE_PROGRESSIVE_BATCH_SIZE,
    offset: currentOffset,
    sort: effectiveSortKey,
  })
    .then(async function (responsePayload) {
      if (responsePayload == null || typeof responsePayload != "object") {
        return cacheEntry;
      }
      var newRows = normalizeCachedGenreRows(responsePayload, { incremental: true });
      if (newRows.length == 0) {
        cacheEntry.loadedCount = cacheEntry.totalCount;
        return cacheEntry;
      }
      var metadataUniverseIds = newRows.map(function (row) {
        return parsePositiveInteger(row?.universeId);
      }).filter(function (universeId) {
        return universeId != null;
      });
      if (metadataUniverseIds.length > 0) {
        await hydrateRoProGenreExperienceMetadata(metadataUniverseIds, newRows);
      }
      var missingThumbnailUniverseIds = [];
      newRows.forEach(function (row) {
        if (sanitizeHttpUrl(row?.thumbnail).length > 0) {
          return;
        }
        var universeId = parsePositiveInteger(row?.universeId);
        if (universeId != null) {
          missingThumbnailUniverseIds.push(universeId);
        }
      });
      if (missingThumbnailUniverseIds.length > 0) {
        await hydrateRoProGenreExperienceThumbnails(missingThumbnailUniverseIds, newRows);
      }
      cacheEntry.rows = cacheEntry.rows.concat(newRows);
      cacheEntry.loadedCount = cacheEntry.rows.length;
      var serverTotal = parseInt(responsePayload.totalCount, 10);
      if (Number.isFinite(serverTotal) && serverTotal >= 0) {
        cacheEntry.totalCount = serverTotal;
      }
      return cacheEntry;
    })
    .catch(function () {
      return cacheEntry;
    })
    .finally(function () {
      roproGenreMoreFetchInFlightByFilterKey.delete(filterKey);
    });
  roproGenreMoreFetchInFlightByFilterKey.set(filterKey, fetchPromise);
  return await fetchPromise;
}

async function hydrateRoProGenreExperienceThumbnails(universeIds, targetExperienceRows) {
  var uniqueUniverseIds = Array.from(new Set((Array.isArray(universeIds) ? universeIds : []).filter(function (id) {
    return Number.isFinite(id) && id > 0;
  })));
  if (uniqueUniverseIds.length == 0) {
    return;
  }
  var iconUrlByUniverseId = new Map();
  var batches = chunkArray(uniqueUniverseIds, ROPRO_GENRE_THUMBNAIL_BATCH_SIZE);
  for (var i = 0; i < batches.length; i++) {
    var batch = batches[i];
    try {
      var iconResponse = await fetchUniverseGameIcons(batch);
      if (Array.isArray(iconResponse?.data)) {
        iconResponse.data.forEach(function (iconRow) {
          var universeId = parseInt(iconRow?.targetId || iconRow?.universeId || iconRow?.id, 10);
          if (!Number.isFinite(universeId) || universeId <= 0) {
            return;
          }
          var imageUrl = sanitizeHttpUrl(iconRow?.imageUrl);
          if (imageUrl.length > 0) {
            iconUrlByUniverseId.set(universeId, imageUrl);
          }
        });
      }
    } catch (_) {}
    if (i < batches.length - 1) {
      await sleepMs(100);
    }
  }
  if (iconUrlByUniverseId.size == 0) {
    return;
  }
  (Array.isArray(targetExperienceRows) ? targetExperienceRows : []).forEach(function (experienceData) {
    if (experienceData == null || typeof experienceData != "object") {
      return;
    }
    var universeId = parseInt(experienceData.universeId, 10);
    if (!Number.isFinite(universeId) || universeId <= 0) {
      return;
    }
    var iconUrl = iconUrlByUniverseId.get(universeId);
    if (typeof iconUrl != "string" || iconUrl.length == 0) {
      return;
    }
    experienceData.thumbnail = iconUrl;
  });
  roproPlaceExperienceMap.forEach(function (experienceData) {
    if (experienceData == null) {
      return;
    }
    var universeId = parseInt(experienceData.universeId, 10);
    if (!Number.isFinite(universeId) || universeId <= 0) {
      return;
    }
    var iconUrl = iconUrlByUniverseId.get(universeId);
    if (typeof iconUrl != "string" || iconUrl.length == 0) {
      return;
    }
    experienceData.thumbnail = iconUrl;
  });
}

function applyRoProGenreFilters() {
  roproGenreRenderGeneration++;
  var renderGeneration = roproGenreRenderGeneration;
  if (!isRoProGenreSupportedPath()) {
    return;
  }
  if (!isRoProGenreExplorerMode()) {
    toggleRoProChartsNativeRowsForExplorer(false);
    roproGenreCurrentPageIndex = 0;
    roproGenreCurrentRenderKey = "";
    updateRoProGenrePaginationState(0, 0);
    return;
  }
  if (!ensureRoProGenreResultsShellMounted() || roproGenreResultsGrid == null || roproGenreResultsStatus == null) {
    return;
  }
  while (roproGenreResultsGrid.firstChild) {
    roproGenreResultsGrid.removeChild(roproGenreResultsGrid.firstChild);
  }
  if (roproSelectedGenreKey.length == 0) {
    setRoProGenreDebugAttribute("data-ropro-genre-filters-fetch-state", "waiting-for-selection");
    roproGenreResultsStatus.textContent = "Select a genre to load games.";
    roproGenreCurrentPageIndex = 0;
    roproGenreCurrentRenderKey = "";
    updateRoProGenrePaginationState(0, 0);
    return;
  }
  var selectedSortKey = normalizeRoProGenreSortKey(roproSelectedSortKey);
  roproGenreResultsStatus.textContent = "";
  var loaderContainer = document.createElement("div");
  loaderContainer.className = "ropro-genre-results-loader";
  if (typeof roproApiAdapter !== "undefined" && typeof roproApiAdapter.buildBrandedLoaderHtml === "function") {
    roproApiAdapter.ensureBrandedLoaderStyles();
    loaderContainer.innerHTML = roproApiAdapter.buildBrandedLoaderHtml({ className: "ropro-genre-results-loading" });
    var loaderLabel = loaderContainer.querySelector(".ropro-branded-loader-label");
    if (loaderLabel) {
      loaderLabel.textContent = "Loading games...";
    }
  } else {
    loaderContainer.textContent = "Loading genre search results...";
  }
  roproGenreResultsGrid.appendChild(loaderContainer);
  var selectedFilterKey = getRoProGenreResultsFilterKey(
    getRoProSelectedGenreLabel(),
    getRoProSelectedSubgenreLabel(),
    selectedSortKey
  );
  if (roproGenreCurrentRenderKey !== selectedFilterKey) {
    roproGenreCurrentRenderKey = selectedFilterKey;
    roproGenreCurrentPageIndex = 0;
  }
  updateRoProGenrePaginationState(0, 0);
  loadRoProGenreResultsFromCache(selectedSortKey).then(async function (cacheEntry) {
    if (
      renderGeneration !== roproGenreRenderGeneration ||
      roproGenreResultsGrid == null ||
      roproGenreResultsStatus == null
    ) {
      return;
    }
    var activeFilterKey = getRoProGenreResultsFilterKey(
      getRoProSelectedGenreLabel(),
      getRoProSelectedSubgenreLabel(),
      normalizeRoProGenreSortKey(roproSelectedSortKey)
    );
    if (selectedFilterKey !== activeFilterKey) {
      return;
    }
    if (!cacheEntry || !Array.isArray(cacheEntry.rows)) {
      cacheEntry = { rows: [], totalCount: 0, loadedCount: 0 };
    }
    var cachedRows = cacheEntry.rows;
    var totalCount = cacheEntry.totalCount || 0;
    var loadedCount = cacheEntry.loadedCount || 0;
    var maxResults = ROPRO_GENRE_SYNTHETIC_RENDER_LIMIT;
    var cappedRowCount = Math.min(maxResults, cachedRows.length);

    var gridColumns = ROPRO_GENRE_TARGET_ROWS;
    if (roproGenreResultsGrid != null) {
      var computedCols = getComputedStyle(roproGenreResultsGrid).gridTemplateColumns;
      if (typeof computedCols === "string" && computedCols.length > 0 && computedCols !== "none") {
        var colCount = computedCols.split(/\s+/).filter(function (v) { return v.length > 0; }).length;
        if (colCount > 0) {
          gridColumns = colCount;
        }
      }
    }
    var effectivePageSize = gridColumns * ROPRO_GENRE_TARGET_ROWS;
    if (effectivePageSize < 6) {
      effectivePageSize = ROPRO_GENRE_PAGE_SIZE_BASE;
    }

    var pageStartIndex = roproGenreCurrentPageIndex * effectivePageSize;
    var pageEndIndex = pageStartIndex + effectivePageSize;

    if (pageEndIndex > cappedRowCount && loadedCount < totalCount && loadedCount < maxResults) {
      while (roproGenreResultsGrid.firstChild) {
        roproGenreResultsGrid.removeChild(roproGenreResultsGrid.firstChild);
      }
      var moreLoaderContainer = document.createElement("div");
      moreLoaderContainer.className = "ropro-genre-results-loader";
      if (typeof roproApiAdapter !== "undefined" && typeof roproApiAdapter.buildBrandedLoaderHtml === "function") {
        roproApiAdapter.ensureBrandedLoaderStyles();
        moreLoaderContainer.innerHTML = roproApiAdapter.buildBrandedLoaderHtml({ className: "ropro-genre-results-loading" });
        var moreLoaderLabel = moreLoaderContainer.querySelector(".ropro-branded-loader-label");
        if (moreLoaderLabel) {
          moreLoaderLabel.textContent = "Loading more games...";
        }
      } else {
        moreLoaderContainer.textContent = "Loading more games...";
      }
      roproGenreResultsGrid.appendChild(moreLoaderContainer);
      roproGenreResultsStatus.textContent =
        "Loading more games (" + addCommas(loadedCount) + " of " + addCommas(totalCount) + " loaded)...";
      var updatedEntry = await loadMoreRoProGenreResults(selectedFilterKey, selectedSortKey);
      if (
        renderGeneration !== roproGenreRenderGeneration ||
        roproGenreResultsGrid == null ||
        roproGenreResultsStatus == null
      ) {
        return;
      }
      var recheckFilterKey = getRoProGenreResultsFilterKey(
        getRoProSelectedGenreLabel(),
        getRoProSelectedSubgenreLabel(),
        normalizeRoProGenreSortKey(roproSelectedSortKey)
      );
      if (selectedFilterKey !== recheckFilterKey) {
        return;
      }
      if (updatedEntry && Array.isArray(updatedEntry.rows)) {
        cachedRows = updatedEntry.rows;
        totalCount = updatedEntry.totalCount || 0;
        loadedCount = updatedEntry.loadedCount || 0;
        cappedRowCount = Math.min(maxResults, cachedRows.length);
      }
    }

    while (roproGenreResultsGrid.firstChild) {
      roproGenreResultsGrid.removeChild(roproGenreResultsGrid.firstChild);
    }
    if (cappedRowCount == 0) {
      setRoProGenreDebugAttribute("data-ropro-genre-filters-fetch-state", "empty");
      roproGenreCurrentPageIndex = 0;
      roproGenreResultsStatus.textContent = "No games matched this genre/subgenre.";
      updateRoProGenrePaginationState(0, 0);
      return;
    }
    var hasMoreServerData = loadedCount < totalCount && loadedCount < maxResults;
    var estimatedTotalRows = Math.min(Math.max(totalCount, cappedRowCount), maxResults);
    var totalPages = Math.max(1, Math.ceil(estimatedTotalRows / effectivePageSize));
    if (!Number.isFinite(roproGenreCurrentPageIndex) || roproGenreCurrentPageIndex < 0) {
      roproGenreCurrentPageIndex = 0;
    }
    if (roproGenreCurrentPageIndex > totalPages - 1 && !hasMoreServerData) {
      roproGenreCurrentPageIndex = totalPages - 1;
    }
    pageStartIndex = roproGenreCurrentPageIndex * effectivePageSize;
    pageEndIndex = Math.min(pageStartIndex + effectivePageSize, cappedRowCount);
    for (var i = pageStartIndex; i < pageEndIndex; i++) {
      var cardNode = createRoProGenreResultCardNode(cachedRows[i]);
      if (cardNode != null) {
        roproGenreResultsGrid.appendChild(cardNode);
      }
    }
    setRoProGenreDebugAttribute("data-ropro-genre-filters-fetch-state", "ok");
    updateRoProGenrePaginationState(cappedRowCount, totalPages, hasMoreServerData);
    var statusParts = "Showing " + addCommas(pageStartIndex + 1) + "-" + addCommas(pageEndIndex);
    if (loadedCount < totalCount) {
      statusParts += " of " + addCommas(totalCount) + " total";
    } else {
      statusParts += " of " + addCommas(cappedRowCount) + " matching";
    }
    statusParts += " games, sorted by " + getRoProGenreSortStatusLabel(selectedSortKey) + ".";
    roproGenreResultsStatus.textContent = statusParts;
  });
}

function scheduleRoProGenreMetadataRefresh(delayMs) {
  var normalizedDelayMs = Number.isFinite(delayMs) ? Math.max(0, delayMs) : 0;
  if (roproGenreRefreshTimer != null) {
    clearTimeout(roproGenreRefreshTimer);
  }
  roproGenreRefreshTimer = setTimeout(function () {
    roproGenreRefreshTimer = null;
    if (!ensureRoProGenreFiltersMounted()) {
      return;
    }
    refreshRoProGenreSelects();
    applyRoProGenreFilters();
  }, normalizedDelayMs);
}

async function initializeRoProGenreFilters() {
  if (roproGenreFiltersInitialized || roproGenreInitInFlight || !isRoProGenreSupportedPath()) {
    return;
  }
  roproGenreInitInFlight = true;
  setRoProGenreDebugAttribute("data-ropro-genre-filters-enabled-source", "validated-setting");
  var validatedGenreFiltersEnabled = await fetchSetting("genreFilters");
  roproGenreFiltersEnabled = validatedGenreFiltersEnabled === true;
  setRoProGenreDebugAttribute(
    "data-ropro-genre-filters-enabled",
    roproGenreFiltersEnabled ? "true" : "false"
  );
  if (!roproGenreFiltersEnabled) {
    setRoProGenreDebugAttribute("data-ropro-genre-filters-skip-reason", "setting-disabled");
    roproGenreInitInFlight = false;
    return;
  }
  setRoProGenreDebugAttribute("data-ropro-genre-filters-skip-reason", "");
  ensureRoProGenreFilterStyles();
  readRoProGenreFiltersFromQuery();
  setRoProGenreDebugAttribute("data-ropro-genre-filters-mode", isRoProGenreExplorerMode() ? "explorer" : "search");
  if (isRoProGenreSyntheticPath()) {
    startRoProGenre404Suppression();
    ensureRoProGenreSyntheticPageMounted();
  }
  var defaultDeviceType = normalizeGenreKey($("meta[name='device-meta']").attr("data-device-type")) || "computer";
  roproChartsDeviceFilter = getChartsQueryFilterParam("device", defaultDeviceType);
  roproChartsCountryFilter = getChartsQueryFilterParam("country", "all");
  if (!ensureRoProGenreFiltersMounted()) {
    setRoProGenreDebugAttribute("data-ropro-genre-filters-mounted", "false");
    setTimeout(function () {
      initializeRoProGenreFilters();
    }, 250);
    roproGenreInitInFlight = false;
    return;
  }
  roproGenreFiltersInitialized = true;
  setRoProGenreSelectsLoading();
  if (isRoProGenreExplorerMode()) {
    ensureRoProGenreResultsShellMounted();
  } else {
    toggleRoProChartsNativeRowsForExplorer(false);
  }
  scheduleRoProGenreMetadataRefresh(0);
  roproGenreInitInFlight = false;
}

var mountAttempts = 0;
var maxMountAttempts = 300;
var genreMountAttempts = 0;
var genreMountMaxAttempts = 300;

var myInterval = setInterval(function () {
  if (isRoProGenreStandalonePath()) {
    clearInterval(myInterval);
    initializeRoProGenreFilters();
    return;
  }
  var gamesPageSection = $('.games-page-container').first().find('> .section').first();
  if (gamesPageSection.length == 0) {
    gamesPageSection = $('.games-page-container:first .section:first');
  }
  var hasFiltersAnchor = gamesPageSection.find('.filters-container:first').length > 0;
  var gamesListRowCount = gamesPageSection.find('.games-list-container').length;
  var hasPreferredGamesListAnchor = gamesListRowCount >= 2;
  var hasFallbackModernAnchor =
    gamesPageSection.find('.games-list-header:first').length > 0 ||
    gamesListRowCount > 0 ||
    hasFiltersAnchor;
  var hasLegacyAnchor = $('.container-header.games-filter-changer').length > 0;
  var readyModern =
    hasPreferredGamesListAnchor || (mountAttempts >= maxMountAttempts && hasFallbackModernAnchor);
  var readyLegacy = gamesPageSection.length == 0 && hasLegacyAnchor;
  if (readyModern || readyLegacy) {
    clearInterval(myInterval);
    if (!isRoProGenreExplorerMode() && isChartsPageDefaultView() && $('.ropro-all-experiences-list-container').length == 0) {
      addAllExperiences();
    }
    if (isChartsPagePath()) {
      startChartsFilterWatcher();
    }
    initializeRoProGenreFilters();
  }
  mountAttempts++;
}, 100);

var chartsFilterWatcherStarted = false;
function startChartsFilterWatcher() {
  if (chartsFilterWatcherStarted) {
    return;
  }
  chartsFilterWatcherStarted = true;
  var lastCheckedHref = window.location.href;
  setInterval(function () {
    if (window.location.href === lastCheckedHref) {
      return;
    }
    lastCheckedHref = window.location.href;
    var container = $('.ropro-all-experiences-list-container');
    if (container.length > 0) {
      if (isChartsPageDefaultView()) {
        container.show();
      } else {
        container.hide();
      }
    }
  }, 200);
}

var roproGenreMountInterval = setInterval(function () {
  if (roproGenreFiltersInitialized || genreMountAttempts >= genreMountMaxAttempts || !isRoProGenreSupportedPath()) {
    if (roproGenreFiltersInitialized || genreMountAttempts >= genreMountMaxAttempts) {
      clearInterval(roproGenreMountInterval);
    }
    genreMountAttempts++;
    return;
  }
  initializeRoProGenreFilters();
  genreMountAttempts++;
}, 100);
