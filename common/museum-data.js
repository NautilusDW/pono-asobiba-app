/**
 * museum-data.js
 * Single source of truth for aquarium museum zones and creature profiles.
 * Loads museums.json and creatures.json, merges with HARDCODED_PROFILES for
 * the 7 built-in creatures that live only in aquarium/index.html.
 */
(function () {
  'use strict';

  // ── Profiles for the 7 hardcoded creatures in aquarium/index.html ─────────
  const HARDCODED_PROFILES = {
    octopus: {
      readingName: 'たこ',
      subtitle: 'あしが 8ぽんの すいえいせんしゅ',
      habitat: 'いわばの あいだ',
      sizeText: 'こどもくらい',
      funFacts: [
        'ちからもちで、びんの ふたも あけられるよ',
        'びっくりすると まっくろな すみを はくよ',
        'からだの いろを さっと かえて かくれんぼが とくいだよ'
      ]
    },
    jellyfish: {
      readingName: 'くらげ',
      subtitle: 'ふわふわ ひかる うみの ゆうれい',
      habitat: 'ひろい うみの なか',
      sizeText: 'たまごくらい〜おさらくらい',
      funFacts: [
        'のうも こころぞうも ないのに ちゃんと うごくよ',
        'からだの 95% が みずで できているよ',
        'あしに さわると ぴりっと するよ、きをつけてね'
      ]
    },
    turtle: {
      readingName: 'うみがめ',
      subtitle: 'ゆったり およぐ うみの たびびと',
      habitat: 'あたたかい うみ〜にほんのうみ',
      sizeText: 'おとなより おおきい',
      funFacts: [
        '100ねんいじょう いきることも あるよ',
        'うまれた はまに たまごを うみに もどってくるよ',
        'ひれのような まえあしで ぐんぐん およぐよ'
      ]
    },
    fish: {
      readingName: 'さかな',
      subtitle: 'うみを じゆうに およぐよ',
      habitat: 'いろんな うみ',
      sizeText: 'てのひらくらい',
      funFacts: [
        'えらで みずの なかの さんそを すうよ',
        'うろこが よろいみたいに からだを まもるよ',
        'むれで いっしょに およいで てきから にげるよ'
      ]
    },
    submarine: {
      readingName: 'せんすいかん',
      subtitle: 'うみの そこを たんけんする のりもの',
      habitat: 'ふかい うみ',
      sizeText: 'バスより おおきい',
      funFacts: [
        'みずを いっぱい いれると しずんで、だすと うかびあがるよ',
        'まっくらな うみの そこも とくしゅな ライトで みえるよ',
        'ちかい ゆーんって おとで なかまに れんらくするよ'
      ]
    },
    sunfish: {
      readingName: 'まんぼう',
      subtitle: 'せかいで いちばん おもい さかな',
      habitat: 'あたたかい うみ',
      sizeText: 'じどうしゃくらい',
      funFacts: [
        'からだが まるくて しっぽが ほとんど ないよ',
        'いちどに 3おくこも たまごを うむよ',
        'うみの うえで ひなたぼっこするのが すきだよ'
      ]
    },
    shark: {
      readingName: 'さめ',
      subtitle: 'うみの ちょうじょうきゅう ハンター',
      habitat: 'せかいじゅうの うみ',
      sizeText: 'じどうしゃくらい',
      funFacts: [
        'はが ぬけても なんどでも はえてくるよ',
        'はだで でんきを かんじて えものを みつけるよ',
        'さめは おさかなじゃなくて なんこつぎょるいの なかまだよ'
      ]
    }
  };

  // ── Hardcoded zone assignments for the 7 built-in creatures ───────────────
  const HARDCODED_ZONES = {
    octopus:    ['japan_coast'],
    jellyfish:  ['jellyfish_room'],
    turtle:     ['tropical_reef', 'japan_coast'],
    fish:       ['tropical_reef', 'japan_coast'],
    submarine:  ['big_fish'],
    sunfish:    ['big_fish', 'japan_coast'],
    shark:      ['big_fish']
  };

  // ── Internal cache ─────────────────────────────────────────────────────────
  let _zonesData  = null;  // array from museums.json
  let _creaturesData = null;  // array from creatures.json
  let _loadPromise = null;

  function _basePath(base) {
    return (base || '').replace(/\/$/, '');
  }

  async function _load(base) {
    const bp = _basePath(base);
    const [mRes, cRes] = await Promise.all([
      fetch(bp + '/assets/data/museums.json?v=' + Date.now()),
      fetch(bp + '/assets/data/creatures.json?v=' + Date.now())
    ]);
    if (!mRes.ok) throw new Error('museums.json fetch failed: ' + mRes.status);
    if (!cRes.ok) throw new Error('creatures.json fetch failed: ' + cRes.status);
    const mJson = await mRes.json();
    const cJson = await cRes.json();
    _zonesData     = mJson.zones || [];
    _creaturesData = cJson.creatures || [];
  }

  /**
   * Load data files. Safe to call multiple times — returns cached promise.
   * @param {string} [base=''] base path prefix (e.g. '..' when inside aquarium/)
   */
  function load(base) {
    if (!_loadPromise) {
      _loadPromise = _load(base || '');
    }
    return _loadPromise;
  }

  /**
   * Return array of creature IDs assigned to a zone.
   * Merges hardcoded assignments + creatures.json `zones` field.
   * Falls back to museums.json `creatures` array if available.
   * @param {string} zoneId
   * @returns {string[]}
   */
  function getCreaturesForZone(zoneId) {
    const result = new Set();

    // 1. Hardcoded 7 体
    Object.entries(HARDCODED_ZONES).forEach(([id, zones]) => {
      if (zones.includes(zoneId)) result.add(id);
    });

    // 2. Dynamic creatures (creatures.json)
    if (_creaturesData) {
      _creaturesData.forEach(c => {
        if (Array.isArray(c.zones) && c.zones.includes(zoneId)) {
          result.add(c.id);
        }
      });
    }

    // 3. Fallback: museums.json zones[].creatures list
    if (_zonesData) {
      const zone = _zonesData.find(z => z.id === zoneId);
      if (zone && Array.isArray(zone.creatures)) {
        zone.creatures.forEach(id => result.add(id));
      }
    }

    return Array.from(result);
  }

  /**
   * Return zone metadata object (or null).
   * @param {string} zoneId
   */
  function getZone(zoneId) {
    if (!_zonesData) return null;
    return _zonesData.find(z => z.id === zoneId) || null;
  }

  /**
   * Return all zones.
   */
  function getZones() {
    return _zonesData ? _zonesData.slice() : [];
  }

  /**
   * Return profile for a creature (hardcoded or from creatures.json).
   * @param {string} creatureId
   */
  function getProfile(creatureId) {
    if (HARDCODED_PROFILES[creatureId]) return HARDCODED_PROFILES[creatureId];
    if (_creaturesData) {
      const c = _creaturesData.find(x => x.id === creatureId);
      if (c && c.profile) return c.profile;
    }
    return null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  window.MuseumData = {
    load,
    getCreaturesForZone,
    getZone,
    getZones,
    getProfile
  };
})();
