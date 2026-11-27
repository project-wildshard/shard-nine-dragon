# SF7i: the colour sign atlas says sRGB

The sign atlases are PNGs since SF7a. The engine's product texture path
now reads an image when the file is not KTX2 (engine SF7i), and an image
carries no transfer in its header the way the KTX2 did, so the colour
atlas row says `colour: srgb`. The mono atlas and the glyph field stay
linear data.
