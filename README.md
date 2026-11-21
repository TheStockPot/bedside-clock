![An Echo Show 8 and an Echo Show 5 running the dashboard](images/header.jpg)

# The Stock Pot's Echo Dashboard

A configurable Home Assistant dashboard strategy for **Echo Show 5** and **Echo Show 8** bedside and kitchen
displays. No integration needed: it works like the Energy dashboard, with a built-in setup wizard.

## Pages (turn on the ones you want)
- **Home** - large clock and date. The clock follows the 12/24-hour setting in your Home Assistant profile, or you can set 12-hour or 24-hour in the wizard. Choose Clock only, or Clock + 2, 3 or 4 Cards, or several of them: each one becomes its own home screen (Home, Home 2, ...) with its own cards. Cards can control devices
  (lights, fans, covers, media players, scenes, thermostats...) or show data (a sensor or number can show a graph
  or its current value, your choice). With cards, the
  weather block sits alongside them.
- **Baby monitor** - full-screen live camera.
- **Cameras** - swipe between several cameras (on the Echo Show 8 you can show them all in a 2 column grid instead).
- **Climate** - a thermostat pop-up opened from the fan icon in the navbar.
- **Weather** - current conditions and a daily forecast, large type over your background.
- **Calendar** - this week's events as a list.
- **Timer** - large quick-start tiles, a custom timer picker and a list of running timers (voice-assistant timers appear automatically).
- **Shopping list** - a to-do list sized for touch.

The navigation bar adapts to the pages you enable. It shows at most 5 buttons, so extra pages move into a "More"
pop-up. The climate fan sits at the bottom, above the light shortcut. If you would rather not use the navbar, the
wizard can hide it and you swipe between pages instead (see below).

## Screenshots (Echo Show 8)

### With the navbar

| Home: clock only | Home: clock + 2 cards | Home: clock + 4 cards |
| --- | --- | --- |
| ![Clock only](images/echo8-nav-home-clock.png) | ![Two cards](images/echo8-nav-home-2-cards.png) | ![Four cards](images/echo8-nav-home-4-cards.png) |

| Weather | Calendar | Timer |
| --- | --- | --- |
| ![Weather](images/echo8-nav-weather.png) | ![Calendar](images/echo8-nav-calendar.png) | ![Timer](images/echo8-nav-timer.png) |

### Without the navbar (swipe between pages)

| Home: clock only | Home: clock + 2 cards | Home: clock + 4 cards |
| --- | --- | --- |
| ![Clock only](images/echo8-nonav-home-clock.png) | ![Two cards](images/echo8-nonav-home-2-cards.png) | ![Four cards](images/echo8-nonav-home-4-cards.png) |

| Weather | Calendar | Timer |
| --- | --- | --- |
| ![Weather](images/echo8-nonav-weather.png) | ![Calendar](images/echo8-nonav-calendar.png) | ![Timer](images/echo8-nonav-timer.png) |

## Install (Marketplace)
HACS is now called the [Marketplace](https://www.hacs.xyz/docs/marketplace/) and is built into Home Assistant (Settings > Marketplace).
1. In the Marketplace, add this repo as a custom repository, category **Dashboard**.
2. Download it, then confirm the resource `/local/community/<repo>/bedside-clock-strategy.js` (type: module) exists (older `/hacsfiles/` paths still work).
3. Create a dashboard (Settings > Dashboards), open it, then Edit > three dots > Raw configuration editor and paste:

```yaml
strategy:
  type: custom:bedside-clock
```
4. Reload. The setup wizard appears: pick your display, background and pages, then **Save and reload**.
   Reopen it any time at `/<your-dashboard>/setup`.

## Required cards (install via the Marketplace; only those for the pages you enable are needed)
Each link opens the card in your own Home Assistant's Marketplace (HACS) through My Home Assistant.

- [Navbar Card](https://my.home-assistant.io/redirect/hacs_repository/?owner=joseluis9595&repository=lovelace-navbar-card&category=plugin) (all pages) and [card-mod](https://my.home-assistant.io/redirect/hacs_repository/?owner=thomasloven&repository=lovelace-card-mod&category=plugin) (most pages)
- Home: [Mushroom](https://my.home-assistant.io/redirect/hacs_repository/?owner=piitaya&repository=lovelace-mushroom&category=plugin), [Advanced Digital Clock](https://my.home-assistant.io/redirect/hacs_repository/?owner=sierramike&repository=lovelace-advanced-digital-clock&category=plugin) (**not** the original Digital Clock card: it uses the same name but ignores the clock's size and styling), plus [Bubble Card](https://my.home-assistant.io/redirect/hacs_repository/?owner=Clooos&repository=Bubble-Card&category=plugin) and [Mini Graph Card](https://my.home-assistant.io/redirect/hacs_repository/?owner=kalkih&repository=mini-graph-card&category=plugin) for the card layouts
- Baby monitor / Cameras: [Advanced Camera Card](https://my.home-assistant.io/redirect/hacs_repository/?owner=dermotduffy&repository=advanced-camera-card&category=plugin)
- Timer: [Simple Timer Card](https://my.home-assistant.io/redirect/hacs_repository/?owner=eyalgal&repository=simple-timer-card&category=plugin)
- Calendar: [Calendar Card Pro](https://my.home-assistant.io/redirect/hacs_repository/?owner=alexpfau&repository=calendar-card-pro&category=plugin)
- Optional: kiosk-mode (hides the Home Assistant header, on small screens like the Echo only) and hass-swipe-navigation (swipe between pages)

The wizard's first step lists what is installed and what is missing.

## Backgrounds
Choose from the built-in gradients, none, or **Custom image URL** (for example `/local/bg.jpg`, uploaded to
`config/www`). Use `{device}` in the URL to pick a different file per device, e.g. `/local/bg.{device}.webp`, and
set the background opacity to taste. Camera pages have no background (they are full-screen video).
No photos are bundled.

The wizard shows the five colours it picked from your background (buttons, second colour, blocks, button text and
text) next to a colour picker, so you can change any of them, or reset to the automatic ones.

## Kiosk Satellite
The wizard asks whether you use Kiosk Satellite, then lets you choose its device:

![Kiosk Satellite step of the setup wizard](images/wizard-kiosk-satellite.png)

If you use the Kiosk Satellite app on your Echo, the wizard asks you to choose its device and finds its Calendar and camera view entities from it. The Calendar,
Cameras and Timer pages can then use Kiosk Satellite's built-in views instead of dashboard pages, chosen per page.
Their navbar buttons run the matching action: press the camera view's Show button, pick a view on the Calendar view select,
or open ks://timers. This needs Expose kiosk entities turned on in the app, and the navbar shown.
In the Navigation step, you can also add navbar buttons for any Kiosk Satellite view (Calendar, a camera view, Timers, Alarms,
Now playing, Music library or the app launcher).

In the Home step, switch on "Open a Kiosk Satellite view" for a card to make it a button for one of its views (Calendar, a camera view, Timers, Alarms,
Now playing, Music library or the app launcher). A view card has no entity; a card with an entity keeps the card type its entity decides.

## Hiding the navbar and swiping between pages
In the wizard's Navigation step, choose **No navbar**:

![Navigation step of the setup wizard](images/wizard-navigation.png)

Swiping needs the hass-swipe-navigation card from the Marketplace, or you can enable swipe navigation in Kiosk Satellite instead (see above). The climate pop-up and light
shortcut live in the navbar, so add the thermostat and light as Home cards instead.

## Development
See [DEVELOPMENT.md](DEVELOPMENT.md) if you want to work on the code.

## AI disclosure
I used AI to help put this repo together and structure it correctly, and to speed up formatting and CSS editing, among other things. I reviewed and tested the result on a real Echo Show 5 and Echo Show 8.

## Licence
MIT, see [LICENSE](LICENSE).
