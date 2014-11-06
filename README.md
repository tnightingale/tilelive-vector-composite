tilelive-vector-composite
=========================

Tilelive.js module for compositing Mapbox Vector Tiles from any tilelive source.

Usage:
======

Create sources file:

    /* /path/to/sources.json */
    [
      { "uri": "mapbox:///mapbox.mapbox-streets-v5" },
      { "uri": "tmsource:///path/to/my/local/source.tm2source" }
    ]

Load <code>composite:///path/to/sources.json</code> as a tilelive source.
