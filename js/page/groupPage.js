var url_matches = [
	"/groups/*",
	"/communities/*"
];

function verifyPath(matches) {
  return roproApiAdapter.verifyPath(matches);
}

//Make sure we're on the right page here, factoring in locale subpaths (Ex: "/en-us/"). 
//The content script matches defined in manifest.json should mostly handle this, but this accounts for edge cases.
//In RoPro v2.0 this will be an ES6 imported module function.
if (!verifyPath(url_matches)) throw new Error('RoPro Error: Invalid path!');
