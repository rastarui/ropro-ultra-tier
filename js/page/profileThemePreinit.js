(() => {
	if (!/\/users\/\d+\/profile/i.test(window.location.pathname)) {
		return;
	}

	const root = document.documentElement;
	if (!root) {
		return;
	}
	root.classList.add("ropro-profile-theme-loading");
	if (document.body) {
		document.body.classList.add("ropro-profile-theme-loading");
	} else {
		document.addEventListener(
			"DOMContentLoaded",
			() => {
				if (document.body) {
					document.body.classList.add("ropro-profile-theme-loading");
				}
			},
			{ once: true }
		);
	}

	if (document.getElementById("roproProfileThemePreinitStyle")) {
		return;
	}
	const style = document.createElement("style");
	style.id = "roproProfileThemePreinitStyle";
	style.textContent = `
html.ropro-profile-theme-loading .profile-avatar-left.profile-avatar-gradient,
html.ropro-profile-theme-loading .profile-avatar-left.profile-avatar-gradient .cover-gradient-overlay,
html.ropro-profile-theme-loading .profile-avatar-left.profile-avatar-gradient .cover-blur-overlay {
	background: transparent !important;
	background-color: transparent !important;
	background-image: none !important;
	box-shadow: none !important;
	filter: none !important;
	backdrop-filter: none !important;
	opacity: 0 !important;
	pointer-events: none !important;
}
html.ropro-profile-theme-loading .thumbnail-holder.thumbnail-holder-position,
html.ropro-profile-theme-loading .thumbnail-holder.thumbnail-holder-position::before,
html.ropro-profile-theme-loading .thumbnail-holder.thumbnail-holder-position::after,
html.ropro-profile-theme-loading .thumbnail-holder.thumbnail-holder-position .avatar-thumbnail-container,
html.ropro-profile-theme-loading .thumbnail-holder.thumbnail-holder-position .avatar-thumbnail-container::before,
html.ropro-profile-theme-loading .thumbnail-holder.thumbnail-holder-position .avatar-thumbnail-container::after,
html.ropro-profile-theme-loading .thumbnail-holder.thumbnail-holder-position .thumbnail-2d-container.no-background-thumbnail.thumbnail-span,
html.ropro-profile-theme-loading .thumbnail-holder.thumbnail-holder-position .thumbnail-2d-container.no-background-thumbnail.thumbnail-span img {
	background: transparent !important;
	background-color: transparent !important;
	background-image: none !important;
	box-shadow: none !important;
	filter: none !important;
	backdrop-filter: none !important;
}
html.ropro-profile-theme-loading .thumbnail-holder.thumbnail-holder-position .thumbnail-2d-container.no-background-thumbnail.thumbnail-span img {
	filter: drop-shadow(0 10px 22px rgba(0, 0, 0, 0.56)) drop-shadow(0 0 7px rgba(255, 255, 255, 0.2));
}
`;
	(document.head || root).appendChild(style);
})();
