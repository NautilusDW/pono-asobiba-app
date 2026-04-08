/**
 * zone-boot.js
 * Reads ?zone=<id> from the URL and sets window.ZoneBoot.overrideToggles
 * so aquarium/index.html can restrict which creatures appear.
 *
 * Must be loaded BEFORE the creature-toggle init code in index.html.
 * When no ?zone= param is present, ZoneBoot is a no-op and the aquarium
 * behaves exactly as before (full backward compatibility).
 */
(function () {
  'use strict';

  const params  = new URLSearchParams(window.location.search);
  const zoneId  = params.get('zone');

  if (!zoneId) {
    // Free-play mode — expose a no-op API so callers don't need to null-check
    window.ZoneBoot = {
      zoneId: null,
      isMuseumMode: false,
      overrideToggles: null,
      apply: function () {}
    };
    return;
  }

  // Museum mode — we'll populate overrideToggles after MuseumData loads.
  // aquarium/index.html calls ZoneBoot.apply(creatureToggles) during init.
  window.ZoneBoot = {
    zoneId: zoneId,
    isMuseumMode: true,
    overrideToggles: null,   // filled in by apply()

    /**
     * Called by aquarium/index.html after MuseumData is loaded.
     * Mutates the passed `toggles` object in-place: only zone creatures → true.
     * Also updates the zone header UI if present.
     *
     * @param {Object} toggles  — the live creatureToggles object
     * @param {string[]} allTypes — ALL_CREATURE_TYPES array from index.html
     */
    apply: function (toggles, allTypes) {
      let zoneCreatures = [];

      // Try MuseumData first (preferred, merged source of truth)
      if (window.MuseumData) {
        zoneCreatures = window.MuseumData.getCreaturesForZone(zoneId);
      } else {
        // Fallback: parse museums.json creatures array synchronously if cached
        console.warn('[zone-boot] MuseumData not available, zone may be empty');
      }

      // Set all creatures off, then enable only zone members
      allTypes.forEach(function (id) {
        toggles[id] = zoneCreatures.includes(id);
      });

      this.overrideToggles = Object.assign({}, toggles);

      // Update zone header label
      _updateHeader();
    }
  };

  function _updateHeader() {
    const header = document.getElementById('zoneHeader');
    if (!header) return;

    let zoneName = zoneId;
    let zoneIcon = '🐠';
    if (window.MuseumData) {
      const zone = window.MuseumData.getZone(zoneId);
      if (zone) {
        zoneName = zone.displayName;
        if (zone.icon) zoneIcon = zone.icon;
      }
    }

    const iconEl = header.querySelector('.zone-header-icon');
    const label = header.querySelector('.zone-header-label');
    if (iconEl) iconEl.textContent = zoneIcon;
    if (label) label.textContent = zoneName;

    header.style.display = 'flex';
  }

})();
