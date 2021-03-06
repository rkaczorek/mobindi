# Mobindi

[![Build Status](https://travis-ci.org/pludov/mobindi.svg?branch=master)](https://travis-ci.org/pludov/mobindi)

## Introduction

Monitor and control an astrophotography session from a mobile phone !

This software is intended to be used for nomade astronomy, where size and power consumption matters.
It will typically run on a Raspberry PI or equivalent, using the Indi drivers, and phd2 for guiding.

It provides a fully responsive user interface to control and monitor various aspects of a astrophotograpy session.

Currently the following features are supported:
  * Interface to indi drivers (display connected, connect/disconnect devices, configure)
  * Take anb display single shot for Indi cameras (tested for Simulator on GPhoto)
  * Control and monitor PHD2 guiding :
    * connect devices to PHD2, start and stop PHD2 guiding
    * Display current RMS/Star Mass
    * show a graph of drift (RA/Dec)
  * Autostart phd2 and indiserver


The UI is designed to be fit a vertical screen and will adapt to the resolution (even below 640x480).

Clickable area are big enough to keep the use easy.

Only events are sent between server to UI (unlike VNC which transfer bitmaps), so the UI will stay responsive even over relatively slow link.
(A wifi hotspot should works at 20/30 meters in a field)

The UI can also be displayed on a dedicated LCD display, using a browser in kiosk mode.

This software is still in early development stage; if it proves useful, lots of features will be added, to cover most aspects of a DSLR setup. (alignment, image sequences, astrometry, manual/auto focus, ...)

Remark: this is not a full solution for astronomy on raspberry pi. It is just a user interface over 
existing softwares. You can find full software stack for astro/PI in the following projects :
  * iAstroHub : https://github.com/aruangra/iAstroHub
  * NAFABox : http://www.webastro.net/forum/showthread.php?t=148388
  * ...

## Features

### Camera handling

The camera tab allow settings, display images in a very fast online fits viewer that adapts content to the resolution of the display and the wifi bandwith. It of course supports zoom/pan using finger touch.

The levels are automatically optimized with auto dark/mid/white level according to histogram.

The camera app can also display FWHM and trigger astrometry sync and goto (center).

![The camera UI](docs/camera.png?raw=true "The camera UI")

### Photo sequencer

The sequence editor allows to program repeated shoots, possibily with various exposure and using dithering (with PHD2).

![Sequence list UI](docs/sequence-view.png?raw=true "Sequence list UI")
![Sequence editor UI](docs/sequence-edit.png?raw=true "Sequence editor UI")

### Guiding using PHD2

The guiding tab displays current status of PHD2 as well as guiding statistics (pixels drifts). The settling periods are displayed in green. The graph can be zoomed for inspection.

It is possible to start/stop PHD2 from here, as long as it has a valid configuration. That method rely on automatic star selection from PHD2.

![PHD2 UI](docs/phd2.png?raw=true "PHD2 UI")

### Focusing

In the focus tab, you'll be able to control your focuser, scanning a range of steps to find the optimal value of FWHM.

![Focuser UI](docs/focuser.png?raw=true "Focuser UI")

### Astrometry

The astrometry tab displays settings used for plate solving.

Internally, the fantastic astrometry.net engine is used. Mobinding controls the search range passed to astrometry.net, in order to have super fast result on low hardware.

It is also possible to push your phone GPS coordinates to INDI configuration from here. (the green button on the screenshot indicates that they are already in sync).

![Astrometry settings](docs/astrometry-settings.png?raw=true "Astrometry settings")

### Polar alignment

With astrometry set up, Mobindi can help you align your mount.

It will scan an arc of the sky in right ascension, doing photo+astrometry at different locations, and deduce from that data the location of your polar axis. At least 3 points are required, but more can be used to improve accuracy !

The wizard displays DEC varations corresponding to RA move. A perfect alignement will lead to an horizontal graph (but pay attention to the scale of the vertical axis !)

You'll then be able to adjust your alignment and use the wizard to precisely measure the progress using astrometry.

![Polar Align UI](docs/polar-align.png?raw=true "Polar Align")

### Indi control panel

The indi control panel gives access to all properties of your indi drivers, with a UI dedicated to mobile phone. Almost everything that is not natively covered by Mobindi can be done from here.

You can as well restart stuck drivers here, configure auto restart/auto connect, but for now, it is not possible to add a new driver (this is done in a json config file : local/indi.json)

![Indi control panel UI](docs/indi-panel.png?raw=true "Indi control panel ")

### Indi messages

Notifications from indi driver are visible here. The number of unread messages is displayed when the tab is not selected so you know when something is happening.

![Indi message board](docs/indi-messages.png?raw=true "Indi message board")




## Quick start

Prior to using this software, you must have a working installation of Indi (server and drivers) and phd2 (so that clicking connect then guide actually starts guiding...).

The above instructions are valid for a debian based system (including raspbian for raspberry PI). I use them verbatim on Ubuntu 17.04 (x86/64) and Linaro (Asus Tinker board).

Some packages are required for building. Install them:
```
sudo apt-get install git cmake zlib1g-dev libcurl4-openssl-dev libgsl-dev libraw-dev libcfitsio-dev libjpeg-dev libpng-dev libcgicc-dev daemontools
```

You also need nodejs installed, with a recent version (> v8). I use the latest v6 (v8.4.0)
```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install
```

Installation and build:
```
git clone https://github.com/pludov/mobindi.git
cd mobindi
npm install
(cd ui && npm install && npm run-script build)
(cd fitsviewer && cmake . && make)
```

Then start the server:
```
npm start
```

Connect to http://localhost:8080


## Starting phd2/indiserver

As an option, the server can start indiserver and phd2. For this to work, you must activate it in two configuration files : local/indi.json and local/phd2.json. (The configuration files are not created until the first run of the server)

Theses files are empty by default; when edited, the server must be restarted to take changes into account. Examples are provided (local/indi.default.json and local/phd2.default.json)

For indi, you must declare all devices that you intend to run in the json file (see the default for an example).


## Internals

There are three parts :
  * A HTTP server in nodejs communicates with PHD and Indi
  * A CGI for image preview (fitsviewer)
  * A react UI (served by the HTTP server) that render the app

Appart from images, communication between server and UI uses exclusively websocket.

## Developpment

For doing dev, a server dedicated to React UI can be used. This provides instant reloading on change (code, css, ...).
To use it, start the server, and the ui : cd ui && npm start
Then connect to port 3000 : http://localhost:3000

The REACT http server on port 3000 will automatically push changes to UI, and relay request to the backed to port 8080


## Licence

Copyright ©2017-2018 Ludovic Pollet &lt;<a mailto="pludow@gmail.com">pludow@gmail.com</a>&gt;. All rights reserved.

This software is provided under the GPL-3 licence.

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License version 3 as published by
the Free Software Foundation.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.

Astrometry icon made by smashicons from www.flaticon.com

