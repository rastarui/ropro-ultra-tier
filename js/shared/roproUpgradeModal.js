(function() {
	"use strict";

	var UPGRADE_HOST_ALLOWED = Object.freeze([
		"ropro.io",
		"www.ropro.io"
	]);
	var UPGRADE_PATH_PREFIXES = Object.freeze([
		"/",
		"/upgrade",
		"/render",
		"/terms",
		"/terms/",
		"/dances/",
		"/render/"
	]);
	var VIDEO_PATH_PREFIXES = Object.freeze([
		"/dances/",
		"/render/"
	]);
	var UPGRADE_SCHEME_BLOCKLIST = Object.freeze([
		"javascript",
		"data",
		"vbscript",
		"file",
		"chrome",
		"chrome-extension",
		"safari-web-extension",
		"moz-extension",
		"moz",
		"app"
	]);

	function sanitizeText(value, fallback) {
		if (typeof value !== "string") {
			return typeof fallback === "string" ? fallback : "";
		}
		var normalized = value.replace(/\s+/g, " ").trim();
		if (normalized.length === 0) {
			return typeof fallback === "string" ? fallback : "";
		}
		return normalized;
	}

	function stripControlChars(value) {
		return String(value == null ? "" : value).replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
	}

	function decodeUpgradeUrlLikely(rawUrl) {
		var decoded = String(rawUrl == null ? "" : rawUrl);
		for (var i = 0; i < 3; i++) {
			try {
				var nextDecoded = decodeURIComponent(decoded);
				if (nextDecoded === decoded) {
					break;
				}
				decoded = nextDecoded;
			} catch (e) {
				break;
			}
		}
		return decoded;
	}

	function hasBlockedUpgradeUrlScheme(rawUrl) {
		var normalizedUrl = stripControlChars(rawUrl).toLowerCase().trim();
		var decodedUrl = decodeUpgradeUrlLikely(normalizedUrl);
		var checkedUrls = [normalizedUrl, decodedUrl];
		for (var i = 0; i < UPGRADE_SCHEME_BLOCKLIST.length; i++) {
			var blockedScheme = UPGRADE_SCHEME_BLOCKLIST[i];
			var blockedPrefix = blockedScheme + ":";
			var blockedBypass = blockedScheme + "-";
			for (var j = 0; j < checkedUrls.length; j++) {
				var candidate = stripControlChars(checkedUrls[j]).trim();
				if (candidate.indexOf(blockedPrefix) === 0) {
					return true;
				}
				if (candidate.indexOf(blockedBypass) === 0) {
					return true;
				}
				if (candidate.indexOf(blockedPrefix + "%") === 0) {
					return true;
				}
				if (candidate.indexOf(blockedBypass + "%") === 0) {
					return true;
				}
			}
		}
		return false;
	}

	function isAllowedUpgradeHost(hostname) {
		var normalizedHost = String(hostname == null ? "" : hostname).toLowerCase();
		if (normalizedHost.length === 0) {
			return false;
		}
		for (var i = 0; i < UPGRADE_HOST_ALLOWED.length; i++) {
			if (normalizedHost === UPGRADE_HOST_ALLOWED[i]) {
				return true;
			}
		}
		return normalizedHost.endsWith(".ropro.io");
	}

	function isAllowedUpgradePath(pathname, allowedPrefixes) {
		var normalizedPath = String(pathname == null ? "" : pathname);
		if (normalizedPath.length === 0) {
			return false;
		}
		var allowed = Array.isArray(allowedPrefixes) && allowedPrefixes.length > 0 ? allowedPrefixes : UPGRADE_PATH_PREFIXES;
		for (var i = 0; i < allowed.length; i++) {
			if (
				normalizedPath === allowed[i] ||
				normalizedPath.indexOf(allowed[i]) === 0
			) {
				return true;
			}
		}
		return false;
	}

	function normalizeUpgradeModalUrl(rawUrl, fallbackUrl, allowedPathPrefixes) {
		var fallback = typeof fallbackUrl === "string" ? fallbackUrl : "https://ropro.io";
		var normalized = typeof rawUrl === "string" ? rawUrl.trim() : "";
		if (normalized.length === 0) {
			return fallback;
		}
		if (normalized.length > 2048) {
			normalized = normalized.slice(0, 2048);
		}
		if (hasBlockedUpgradeUrlScheme(normalized)) {
			return fallback;
		}
		try {
			var parsedUrl = new URL(normalized, fallback);
			if (parsedUrl.protocol !== "https:") {
				return fallback;
			}
			if (!isAllowedUpgradeHost(parsedUrl.hostname)) {
				return fallback;
			}
			if (!isAllowedUpgradePath(parsedUrl.pathname, allowedPathPrefixes)) {
				return fallback;
			}
			return parsedUrl.origin + parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
		} catch (e) {
			return fallback;
		}
	}

	function sanitizeTier(value) {
		if (
			typeof roproApiAdapter !== "undefined" &&
			roproApiAdapter != null &&
			typeof roproApiAdapter.normalizeUpgradeTier === "function"
		) {
			return roproApiAdapter.normalizeUpgradeTier(value);
		}
		var normalized = sanitizeText(value, "plus").toLowerCase();
		if (normalized === "rex" || normalized === "pro" || normalized === "pro_tier" || normalized === "ultra" || normalized === "ultra_tier") {
			return "rex";
		}
		return "plus";
	}

	function tierInfo(tier) {
		if (tier === "rex") {
			return {
				label: "RoPro Rex",
				title: "RoPro Rex Feature",
				iconPath: "/images/rex_icon.png",
				upgradeHref: "https://ropro.io#rex"
			};
		}
		return {
			label: "RoPro Plus",
			title: "RoPro Plus Feature",
			iconPath: "/images/plus_icon.png",
			upgradeHref: "https://ropro.io#plus"
		};
	}

	function normalizeSubscribersSuffix(suffix, tierLabel) {
		var normalizedSuffix = sanitizeText(suffix, "subscribers.");
		var normalizedTierLabel = sanitizeText(tierLabel, "");
		var normalizedTier = normalizedTierLabel.toLowerCase();
		if (normalizedTier.length > 0 && normalizedSuffix.toLowerCase().indexOf(normalizedTier) === 0) {
			normalizedSuffix = normalizedSuffix.slice(normalizedTierLabel.length).trim();
		}
		if (normalizedSuffix.length === 0) {
			return "subscribers.";
		}
		return normalizedSuffix;
	}

	function normalizeBenefits(benefits) {
		if (!Array.isArray(benefits)) {
			return [];
		}
		var normalized = [];
		for (var i = 0; i < benefits.length; i++) {
			var value = sanitizeText(benefits[i], "");
			if (value.length > 0) {
				normalized.push(value);
			}
		}
		return normalized;
	}

	function defaultBenefitsForTier(tier) {
		if (tier === "rex") {
			return [
				"Advanced Trade Search and value-focused trade matching",
				"Trade Board posting tools and wishlist management",
				"Trade Notifier controls with suspected bot badges",
				"Live experience counters and profile value insights"
			];
		}
		return [
			"Best Connection sorting and live server ping visibility",
			"More Game Filters and Like Ratio Filter",
			"Trade Value and Demand Calculator",
			"More Game Playtime Sorts"
		];
	}

	function removeModalById(modalId) {
		var existing = document.getElementById(modalId);
		if (existing == null) {
			return;
		}
		if (existing.__roproEscHandler != null) {
			document.removeEventListener("keydown", existing.__roproEscHandler);
		}
		if (existing.parentNode != null) {
			existing.parentNode.removeChild(existing);
		}
	}

	function appendText(el, text) {
		el.appendChild(document.createTextNode(text));
	}

	function createEl(tagName, className) {
		var el = document.createElement(tagName);
		if (typeof className === "string" && className.length > 0) {
			el.className = className;
		}
		return el;
	}

	function createTierBadge(tierLabel, tierIconUrl) {
		var tierSpan = createEl("span", "ropro-upgrade-tier");
		var tierIcon = document.createElement("img");
		tierIcon.src = tierIconUrl;
		tierIcon.alt = tierLabel;
		tierSpan.appendChild(tierIcon);
		appendText(tierSpan, tierLabel);
		return tierSpan;
	}

	function createSubtitle(options, tierLabel, tierIconUrl) {
		var subtitle = createEl("p", "ropro-upgrade-subtitle");
		var rawSubtitle = sanitizeText(options.subtitleText, "");
		if (rawSubtitle.length > 0 || options.showTierBadge === false) {
			appendText(subtitle, rawSubtitle);
			return subtitle;
		}
		var featureLabel = sanitizeText(options.featureLabel, "This feature");
		var suffix = normalizeSubscribersSuffix(options.subscribersSuffix, tierLabel);
		appendText(subtitle, featureLabel + " is available for ");
		subtitle.appendChild(createTierBadge(tierLabel, tierIconUrl));
		appendText(subtitle, " " + suffix);
		var subtitleExtra = sanitizeText(options.subtitleExtra, "");
		if (subtitleExtra.length > 0) {
			appendText(subtitle, " " + subtitleExtra);
		}
		return subtitle;
	}

	function createBenefitsBlock(benefits, footerText) {
		var benefitsDiv = createEl("div", "ropro-upgrade-benefits");
		var heading = document.createElement("h3");
		heading.textContent = "More Subscription Benefits";
		benefitsDiv.appendChild(heading);
		var list = document.createElement("ul");
		for (var i = 0; i < benefits.length; i++) {
			var li = document.createElement("li");
			li.textContent = benefits[i];
			list.appendChild(li);
		}
		var footerLi = createEl("li", "ropro-upgrade-footer-note");
		footerLi.textContent = footerText;
		list.appendChild(footerLi);
		benefitsDiv.appendChild(list);
		return benefitsDiv;
	}

	function openUpgradeModal(options) {
		var config = typeof options === "object" && options != null ? options : {};
		var modalId = sanitizeText(config.modalId, "standardUpgradeModal");
		var tier = sanitizeTier(config.tier);
		var tierConfig = tierInfo(tier);
		var tierIconUrl = chrome.runtime.getURL(tierConfig.iconPath);
		var roproLogoUrl = chrome.runtime.getURL("/images/ropro_logo_small.png");
		var titleText = sanitizeText(config.title, tierConfig.title);
		var contextLabel = sanitizeText(config.contextLabel, "RoPro Feature");
		var ctaLabel = sanitizeText(config.ctaLabel, "Upgrade");
		var ctaHref = sanitizeText(config.ctaHref, tierConfig.upgradeHref);
		var footerText = sanitizeText(config.footerText, "Find a full list in RoPro settings.");
		var benefits = normalizeBenefits(config.benefits);
		if (benefits.length === 0) {
			benefits = defaultBenefitsForTier(tier);
		}
		var randomDance = Math.floor(Math.random() * 18) + 1;
		var danceVideoUrl = sanitizeText(config.videoUrl, "https://ropro.io/dances/dance" + randomDance + ".webm");
		var safeCtaHref = normalizeUpgradeModalUrl(ctaHref, tierConfig.upgradeHref, UPGRADE_PATH_PREFIXES);
		var safeVideoUrl = normalizeUpgradeModalUrl(danceVideoUrl, "https://ropro.io/dances/dance" + randomDance + ".webm", VIDEO_PATH_PREFIXES);
		if (typeof roproApiAdapter !== "undefined" && roproApiAdapter != null && typeof roproApiAdapter.getSafeUpgradeUrl === "function") {
			safeCtaHref = roproApiAdapter.getSafeUpgradeUrl(ctaHref) || tierConfig.upgradeHref;
			safeVideoUrl = roproApiAdapter.getSafeUpgradeUrl(danceVideoUrl) || "https://ropro.io/dances/dance" + randomDance + ".webm";
		}

		removeModalById(modalId);

		var overlay = createEl("div", "upgrade-modal ropro-upgrade-modal");
		overlay.id = modalId;
		overlay.style.display = "block";
		overlay.style.zIndex = "100000";

		var card = createEl("div", "upgrade-modal-content ropro-upgrade-card");
		card.setAttribute("role", "dialog");
		card.setAttribute("aria-modal", "true");
		card.setAttribute("aria-labelledby", "roproUpgradeTitle");

		var closeButton = createEl("button", "upgrade-modal-close ropro-upgrade-close");
		closeButton.type = "button";
		closeButton.setAttribute("aria-label", "Close");
		closeButton.textContent = "×";

		var layout = createEl("div", "ropro-upgrade-layout");
		var hero = createEl("div", "ropro-upgrade-hero");

		var logo = createEl("img", "ropro-upgrade-logo");
		logo.src = tierIconUrl;
		logo.alt = tierConfig.label;

		var video = createEl("video", "ropro-upgrade-video");
		video.src = safeVideoUrl;
		video.autoplay = true;
		video.loop = true;
		video.muted = true;
		video.setAttribute("playsinline", "");

		hero.appendChild(logo);
		hero.appendChild(video);

		var copy = createEl("div", "ropro-upgrade-copy-block");
		var contextPill = createEl("div", "ropro-upgrade-context");
		var contextIcon = createEl("img", "ropro-upgrade-context-icon");
		contextIcon.src = roproLogoUrl;
		contextIcon.alt = "RoPro";
		contextPill.appendChild(contextIcon);
		appendText(contextPill, contextLabel);

		var title = createEl("h2", "ropro-upgrade-title");
		title.id = "roproUpgradeTitle";
		title.textContent = titleText;

		var subtitle = createSubtitle(config, tierConfig.label, tierIconUrl);
		var benefitsBlock = createBenefitsBlock(benefits, footerText);
		var ctaLink = createEl("a", "ropro-upgrade-cta-link");
		ctaLink.href = safeCtaHref;
		ctaLink.target = "_blank";
		ctaLink.rel = "noopener noreferrer";

		var ctaButton = createEl("button", "btn-growth-sm PurchaseButton ropro-upgrade-cta-button");
		ctaButton.type = "button";
		ctaButton.textContent = ctaLabel;
		ctaLink.appendChild(ctaButton);
		var tagRow = createEl("div", "ropro-upgrade-tag-row");
		tagRow.appendChild(contextPill);

		copy.appendChild(tagRow);
		copy.appendChild(title);
		copy.appendChild(subtitle);
		copy.appendChild(benefitsBlock);
		copy.appendChild(ctaLink);

		layout.appendChild(hero);
		layout.appendChild(copy);

		card.appendChild(closeButton);
		card.appendChild(layout);
		overlay.appendChild(card);

		var closeModal = function() {
			removeModalById(modalId);
			if (typeof config.onClose === "function") {
				config.onClose();
			}
		};

		closeButton.addEventListener("click", function(event) {
			event.preventDefault();
			closeModal();
		});

		overlay.addEventListener("click", function(event) {
			if (event.target === overlay) {
				closeModal();
			}
		});

		var escHandler = function(event) {
			if (event.key === "Escape") {
				closeModal();
			}
		};
		overlay.__roproEscHandler = escHandler;
		document.addEventListener("keydown", escHandler);

		document.body.insertBefore(overlay, document.body.childNodes[0] || null);
		return overlay;
	}

	window.RoProUpgradeModal = {
		open: openUpgradeModal,
		close: function(modalId) {
			removeModalById(sanitizeText(modalId, "standardUpgradeModal"));
		}
	};
})();
