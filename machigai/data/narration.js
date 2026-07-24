/* まちがいさがしランド — narration.js
 * TTS 3.1 / Leda で収録・1.15倍速を焼き込んだ全ランタイム発話の同期マニフェスト。
 * speech.js より前に読み込み、window.MACHIGAI_NARRATION に公開する。
 */
(function () {
  'use strict';

  var entries = {
    "ふうせん": {
      "file": "assets/audio/narration/tts31-leda-v1/park2_01.mp3",
      "durationSec": 1.568,
      "sha256": "fd644a542d5e5904508d0de72d02b0e8e79e5f159759eb3a59d7aedd93c7f452"
    },
    "ことり": {
      "file": "assets/audio/narration/tts31-leda-v1/park2_02.mp3",
      "durationSec": 1.095,
      "sha256": "0901a45841a0527890f2b85cecb6e7a54c7ca931f82a630497e47ef6dc1e66a4"
    },
    "ちょうちょ": {
      "file": "assets/audio/narration/tts31-leda-v1/park2_03.mp3",
      "durationSec": 1.101,
      "sha256": "775ef475a9f1a7e664b7c2d2c3abb6ba2b66436e28cdded8d84d5dc7e05e2ccd"
    },
    "ひとで": {
      "file": "assets/audio/narration/tts31-leda-v1/ocean2_01.mp3",
      "durationSec": 0.857,
      "sha256": "272ac712da2c2072d9b26fddc46c121908ef0eb80603fff37e3bf36dbff54437"
    },
    "たからばこ": {
      "file": "assets/audio/narration/tts31-leda-v1/ocean2_02.mp3",
      "durationSec": 1.451,
      "sha256": "ae9c29b569a877959e436a8d5f53b18d0b9a8c7596cc97007defd04acd94548a"
    },
    "さかな": {
      "file": "assets/audio/narration/tts31-leda-v1/ocean2_03.mp3",
      "durationSec": 1.407,
      "sha256": "fba4afd75bd2011621e0136e71b0234d0fd500c30099fab952dc6b717f2379fa"
    },
    "とらくたー": {
      "file": "assets/audio/narration/tts31-leda-v1/farm2_01.mp3",
      "durationSec": 1.325,
      "sha256": "9d12c9c0e44765d4c4b45498c29f56fd1dffc0659bdb94b4d2540c13e227f6d3"
    },
    "ひまわり": {
      "file": "assets/audio/narration/tts31-leda-v1/farm2_02.mp3",
      "durationSec": 1.27,
      "sha256": "0322c8f6f684b549ed8b534344168670b40c89456b974ed217d0dadbaa69ccc1"
    },
    "ひよこ": {
      "file": "assets/audio/narration/tts31-leda-v1/farm2_03.mp3",
      "durationSec": 1.304,
      "sha256": "d750f944ab9f581ad01765a6375b40d121c98aaf216d25fc9651f3076846821c"
    },
    "ぺろぺろきゃんでぃ": {
      "file": "assets/audio/narration/tts31-leda-v1/sweets_01.mp3",
      "durationSec": 1.823,
      "sha256": "7f94e3cbc8a53330b76ef06a499ee8e5259e240d44e7eb2f3317dd2d0c4dc371"
    },
    "さくらんぼ": {
      "file": "assets/audio/narration/tts31-leda-v1/sweets_02.mp3",
      "durationSec": 1.449,
      "sha256": "3177d49ecfb25eead375c96d02b6bf66e1f04b9b803e04fece41345808f73eae"
    },
    "どーなつ": {
      "file": "assets/audio/narration/tts31-leda-v1/sweets_03.mp3",
      "durationSec": 1.406,
      "sha256": "c6276adc269d34f0f3c2329e5910e163d040d551a13fe64284db3c4a2201ce46"
    },
    "たいこ": {
      "file": "assets/audio/narration/tts31-leda-v1/concert_01.mp3",
      "durationSec": 1.062,
      "sha256": "68b855a58b23de6a1f72be8e251c3f3496ec39283dc4ba23009757c1fd4f1596"
    },
    "おんぷ": {
      "file": "assets/audio/narration/tts31-leda-v1/concert_02.mp3",
      "durationSec": 1.257,
      "sha256": "cd324efc905952e5ee81db333d9820746b2b4443efafccdf33073ea6d3f091ea"
    },
    "すず": {
      "file": "assets/audio/narration/tts31-leda-v1/concert_03.mp3",
      "durationSec": 1.2,
      "sha256": "3f032d959fc2145abda517b1ef698f322d1820a65102c1a2dfe32e23a786009a"
    },
    "りんご": {
      "file": "assets/audio/narration/tts31-leda-v1/market_01.mp3",
      "durationSec": 1.233,
      "sha256": "ee104752ee33d6ef37bcaa5154169da17d3b3c06be9c507c19cf2ecdbe6e5b04"
    },
    "ばなな": {
      "file": "assets/audio/narration/tts31-leda-v1/market_02.mp3",
      "durationSec": 1.283,
      "sha256": "b509e0b3f50e1e034afe859f68802a02a0cba229a9d11a56a331eb47170da995"
    },
    "ぱぷりか": {
      "file": "assets/audio/narration/tts31-leda-v1/market_03.mp3",
      "durationSec": 1.515,
      "sha256": "586e6f660fe3c61b88cfbc964c98a7d6ce892196241d2def6e9476fede15e00a"
    },
    "らんたん": {
      "file": "assets/audio/narration/tts31-leda-v1/market_04.mp3",
      "durationSec": 1.358,
      "sha256": "9ead4a0a5768c1bce3bfad22dc71cb11b481eba771f27e46fe5bacadf94c6ff1"
    },
    "でんしゃ": {
      "file": "assets/audio/narration/tts31-leda-v1/station_01.mp3",
      "durationSec": 1.122,
      "sha256": "573260f9ba773ed7fe8f5257da5da763f926180e5bb9c80f13ec9cbb76958f4e"
    },
    "はと": {
      "file": "assets/audio/narration/tts31-leda-v1/station_02.mp3",
      "durationSec": 0.955,
      "sha256": "91655f9431a6b8ca956e866b3d9e231cb953e1f4494e4a9842a181876dec62b4"
    },
    "かばん": {
      "file": "assets/audio/narration/tts31-leda-v1/station_03.mp3",
      "durationSec": 1.548,
      "sha256": "9d0041e6a10664f9bff55c9a84c6948f776da363a6867e774c431e7cadee3fad"
    },
    "しんごう": {
      "file": "assets/audio/narration/tts31-leda-v1/station_04.mp3",
      "durationSec": 1.335,
      "sha256": "099e8a415784423c6c14425c89207bb21098d24c49cb92f11366917de71f9551"
    },
    "しょべるかー": {
      "file": "assets/audio/narration/tts31-leda-v1/construction_01.mp3",
      "durationSec": 1.236,
      "sha256": "845e92b8c1e1d9189063cd19689b645a3bbf14fba944ff96abbbc48d6269c568"
    },
    "こーん": {
      "file": "assets/audio/narration/tts31-leda-v1/construction_02.mp3",
      "durationSec": 0.962,
      "sha256": "c09b47687235320d03a89d628152713eb0c2f8dab2ffa5102c67e4d31fa4ac0c"
    },
    "すこっぷ": {
      "file": "assets/audio/narration/tts31-leda-v1/construction_03.mp3",
      "durationSec": 1.25,
      "sha256": "ce24a9cccf49f9416861e30fd2fba98a80723e198df326f0cf5563467b8cf9e6"
    },
    "へるめっと": {
      "file": "assets/audio/narration/tts31-leda-v1/construction_04.mp3",
      "durationSec": 1.287,
      "sha256": "e46eef998773f4c65614fbf0e3aa5aa2e9472b48d79d03e15370164435c8f0e3"
    },
    "おうむの はね": {
      "file": "assets/audio/narration/tts31-leda-v1/jungle_01.mp3",
      "durationSec": 1.756,
      "sha256": "3904fa40f598d9ebd536d728a2a940aba8c301dac97384f6bd99dfeabebed644"
    },
    "さるの しっぽ": {
      "file": "assets/audio/narration/tts31-leda-v1/jungle_02.mp3",
      "durationSec": 1.723,
      "sha256": "6b4cb6f4e40866909c4497f4473b97985279ce5f965667d4195af656b2332133"
    },
    "きりんの もよう": {
      "file": "assets/audio/narration/tts31-leda-v1/jungle_03.mp3",
      "durationSec": 1.756,
      "sha256": "5dd0de331411e848c622462e7419554e45bbb777a49e84a2a17b067f327cdc82"
    },
    "ぞうの みみ": {
      "file": "assets/audio/narration/tts31-leda-v1/jungle_04.mp3",
      "durationSec": 2.276,
      "sha256": "ddbf8dad249961486270699a49936a8ebc45c2f99dcec2ecc2cb6456c5542680"
    },
    "おつきさまの むき": {
      "file": "assets/audio/narration/tts31-leda-v1/bedroom_01.mp3",
      "durationSec": 1.686,
      "sha256": "2785bbb69f31728c485c0a6410ba7a1492188e610bdfebd2c178fa9f120fb2b0"
    },
    "うさぎの みみ": {
      "file": "assets/audio/narration/tts31-leda-v1/bedroom_02.mp3",
      "durationSec": 1.823,
      "sha256": "5a9798089fb08504685e3633723db478f1a42c08581bc85fc7670bfdfba729a4"
    },
    "ぞうの はな": {
      "file": "assets/audio/narration/tts31-leda-v1/bedroom_03.mp3",
      "durationSec": 1.52,
      "sha256": "b4f2abda8253fc790878a83c332661347b0ec3ce37920a874e03a2b8350eabde"
    },
    "まくらの かたち": {
      "file": "assets/audio/narration/tts31-leda-v1/bedroom_04.mp3",
      "durationSec": 1.79,
      "sha256": "e41b8b871cc1e5360281a81072b51b44086e97e7bd8ed72318cf0ec52dd8818d"
    },
    "ほしの かたち": {
      "file": "assets/audio/narration/tts31-leda-v1/space_01.mp3",
      "durationSec": 1.96,
      "sha256": "e9aadffd2b1b57f148d2e366d51e38c490511a914b466eadaea1e3f6ebe7cf94"
    },
    "つきの さき": {
      "file": "assets/audio/narration/tts31-leda-v1/space_02.mp3",
      "durationSec": 1.448,
      "sha256": "db4cd1f698589c2214b3dd80e034c87ed0ad925b20e8916e39649c0a0e29ce3e"
    },
    "うちゅうじんの しょっかく": {
      "file": "assets/audio/narration/tts31-leda-v1/space_03.mp3",
      "durationSec": 2.175,
      "sha256": "d070499f6d3143f774435abb2ae9fa29a31ff7896d52623ed521f7ea87a55435"
    },
    "ろけっとの まど": {
      "file": "assets/audio/narration/tts31-leda-v1/space_04.mp3",
      "durationSec": 1.571,
      "sha256": "ccb78a7ff0e9ec258e64b1d0d6d3a335a1ec01ac6d5d5f1af0f84ccd6c73052b"
    },
    "ろけっとの ほのお": {
      "file": "assets/audio/narration/tts31-leda-v1/space_05.mp3",
      "durationSec": 2.035,
      "sha256": "8e6ac9f998ac90d3cd9259bc958c80af9e7b13f21fbb2f58ffb62b83457e7c76"
    },
    "けむりの さき": {
      "file": "assets/audio/narration/tts31-leda-v1/dino_01.mp3",
      "durationSec": 1.619,
      "sha256": "0c3fdf324cd2d87132aa1fbab5c0d1604087d7ce62005dbab5a47d8de74c9140"
    },
    "きょうりゅうの しっぽ": {
      "file": "assets/audio/narration/tts31-leda-v1/dino_02.mp3",
      "durationSec": 1.79,
      "sha256": "29f3bb38e2c6ed1fa13c32298de67a53393b822ae48e2e67e80a2c6e197a7df0"
    },
    "きょうりゅうの くち": {
      "file": "assets/audio/narration/tts31-leda-v1/dino_03.mp3",
      "durationSec": 1.885,
      "sha256": "21aa6a77750a32fe9a3c8e308c5edeb98105a729a60d0d69f5988bfbd61650f7"
    },
    "きょうりゅうの つめ": {
      "file": "assets/audio/narration/tts31-leda-v1/dino_04.mp3",
      "durationSec": 1.86,
      "sha256": "495442933b7bd5680e72c8e5c0d7cdc114192303429b53425ec5a1b8e27b7203"
    },
    "すの えだ": {
      "file": "assets/audio/narration/tts31-leda-v1/dino_05.mp3",
      "durationSec": 1.414,
      "sha256": "4f33a2a529b812b23078516b718d147ac720242b026e041bef38d3bba38e235c"
    },
    "ちょうちんの しま": {
      "file": "assets/audio/narration/tts31-leda-v1/festival_02.mp3",
      "durationSec": 2.035,
      "sha256": "fe6641e5db7de82bc09df1b69604d6e3fb92b42b55836f3c362f134a39236455"
    },
    "ねこの しま": {
      "file": "assets/audio/narration/tts31-leda-v1/festival_03.mp3",
      "durationSec": 1.432,
      "sha256": "8bb2e0a99164644d3cf48fea6fda88ef7cf89b6139b7f554e462ed48ac1e30a5"
    },
    "きんぎょの しっぽ": {
      "file": "assets/audio/narration/tts31-leda-v1/festival_04.mp3",
      "durationSec": 2.108,
      "sha256": "c080076632d95b520a6f3b6202384ba5ce1b1b481c803496c96e2f22dc900fc8"
    },
    "うちわの ほね": {
      "file": "assets/audio/narration/tts31-leda-v1/festival_05.mp3",
      "durationSec": 1.621,
      "sha256": "f4ba97b2efac80906f296df4457df1a696c0838523904c83d4198d41eb68ca2d"
    },
    "ぼうしの てっぺん": {
      "file": "assets/audio/narration/tts31-leda-v1/snow_01.mp3",
      "durationSec": 1.723,
      "sha256": "9ef9103498327019af698a45a6e9eabae3ca5dee3df7134dc7eba1fcf03745a1"
    },
    "えだの さき": {
      "file": "assets/audio/narration/tts31-leda-v1/snow_02.mp3",
      "durationSec": 1.619,
      "sha256": "ccf5b6f4ce8551231e97358441be1d46e2ba2af3e644372abcfbe6a7a3abb964"
    },
    "まふらーの あみめ": {
      "file": "assets/audio/narration/tts31-leda-v1/snow_03.mp3",
      "durationSec": 1.887,
      "sha256": "c7417a8b3f2106250c1fd608c57cdcb682a9c202c0a5e09c74c6822309da7903"
    },
    "ぺんぎんの まふらー": {
      "file": "assets/audio/narration/tts31-leda-v1/snow_04.mp3",
      "durationSec": 2.28,
      "sha256": "d730fcd310cf864e4ae1a498cd902c8c9a993354dcd71b3d022b859b13667587"
    },
    "そりの さき": {
      "file": "assets/audio/narration/tts31-leda-v1/snow_05.mp3",
      "durationSec": 1.545,
      "sha256": "5c4cef7302b2db7c077c2235852a8825a05f9eb15d3b55615e1ffb544573e980"
    },
    "はたの さき": {
      "file": "assets/audio/narration/tts31-leda-v1/castle_01.mp3",
      "durationSec": 1.548,
      "sha256": "28926f465598a7e243838dfaeb562d67ae6446000452ae0183a34fde393c7b74"
    },
    "おしろの まど": {
      "file": "assets/audio/narration/tts31-leda-v1/castle_03.mp3",
      "durationSec": 1.802,
      "sha256": "6525c4482dd08c33fc9007297043ee058c1e45704bacf276f1f969df498c363c"
    },
    "どらごんの はね": {
      "file": "assets/audio/narration/tts31-leda-v1/castle_04.mp3",
      "durationSec": 3.286,
      "sha256": "00db30dd68c3057a59dd9faad715f238dc59582ea5c8d74f28bb9ff33d74ed13"
    },
    "かんむりの おおきさ": {
      "file": "assets/audio/narration/tts31-leda-v1/castle_05.mp3",
      "durationSec": 2.313,
      "sha256": "36323424162e5fc9fcd064fa5cefd967856163c26840c17a53962bb41ea2a7f9"
    },
    "ぜんぶ みつけた！すごい！": {
      "file": "assets/audio/narration/tts31-leda-v1/completion_all_found.mp3",
      "durationSec": 2.591,
      "sha256": "c936f8efe74739d161f3406d589b4b51a00d8b993e265e1e77e07ed48d2643c4"
    }
  };

  window.MACHIGAI_NARRATION = {
    version: 'tts31-leda-v1',
    model: 'gemini-3.1-flash-tts-preview',
    voice: 'Leda',
    bakedSpeed: 1.15,
    playbackRate: 1,
    volume: 0.92,
    completionText: "ぜんぶ みつけた！すごい！",
    expectedCount: 59,
    entries: entries
  };
})();
