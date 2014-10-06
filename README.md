SimpleMSE
====================

SimpleMSE is a wrapper of Media Source Extensions (MSE) API trying to: 
 
 * Provide cross-platform support of Media Source Extension
  - Provide backward compatability back to MSE v0.5 APIs
  - Handle timestamp overflow problem on certain platform
 * Provide promise-based APIs

Because many smart TVs use MSE, SimpleMSE also provides two utilities for debugging on these devices.

 * ```server.js``` A server to serve local files and save logs.
 * ```TVDebugUtils.js``` Utils for debugging on TVs.

Tests
--------------------
Run in your browser: http://zxy1256.github.io/SimpleHTML5Player/tests/all.html

Run tests locally:

 * Check out the code
 * Start any HTTP server from the top level directly. For example
    
    node server.js | tee log.txt

 * Visit ```localhost:<PORT>/tests/all.html```

References
-----------
 * [Media Source Extension Spec](https://dvcs.w3.org/hg/html-media/raw-file/tip/media-source/media-source.html)