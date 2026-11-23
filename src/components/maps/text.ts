export const mapText = {
  en: {
    title: "Community issue map",
    intro:
      "Only manually published, approximate locations appear here. Pins are rounded to about a kilometre and do not identify an exact address.",
    load: "Load map",
    loading: "Loading map...",
    external:
      "Loading connects to OpenStreetMap. Your IP address and the area you view are shared with its tile service.",
    privateExternal:
      "Loading connects to OpenStreetMap and shares your IP address and viewed area, including the area around your private pin. You can enter coordinates without loading the map.",
    empty: "No public map pins yet.",
    failure: "Map could not load. Use the coordinates or report list below.",
    migration:
      "Map setup requires migration 202611240009_service_operations.sql. Ask the project administrator to apply it, then reload.",
    error: "Could not load location data. Reload to try again.",
    setup:
      "Map setup needs the Supabase project URL and publishable key. Ask the project administrator to configure them.",
    privateTitle: "Private report location (optional)",
    privateHint:
      "Only you and administrators can read these exact coordinates. Enter a pair or click the optional map. No automatic GPS lookup.",
    publicTitle: "Public map pin",
    publicHint:
      "Choose an approximate public location separately. Private coordinates are never copied here. Saving rounds coordinates to two decimal places. Publish an approved report first.",
    latitude: "Latitude",
    longitude: "Longitude",
    save: "Save location",
    remove: "Remove location",
    saving: "Saving...",
    saved: "Location saved.",
    invalid:
      "Enter both coordinates: latitude -90 to 90 and longitude -180 to 180.",
    saveError:
      "Could not save. Check the report status and your access, then retry.",
    locked:
      "Location can be edited while this report is awaiting review or in progress.",
    pick: "Click the map to choose a location. You can also use the coordinate fields.",
    open: "Open public report",
    list: "Published locations",
    back: "Back to community",
    limit: "Showing up to 200 recently published report locations.",
  },
  fil: {
    title: "Mapa ng mga isyu sa komunidad",
    intro:
      "Mga manu-manong inilathala at tinatayang lokasyon lamang ang makikita rito. Ang mga pin ay ni-round sa humigit-kumulang isang kilometro at hindi tumutukoy sa eksaktong tirahan.",
    load: "I-load ang mapa",
    loading: "Nilo-load ang mapa...",
    external:
      "Kokonekta sa OpenStreetMap ang pag-load. Makikita ng tile service nito ang iyong IP address at ang lugar na tinitingnan mo.",
    privateExternal:
      "Kokonekta sa OpenStreetMap ang pag-load at makikita nito ang iyong IP address at lugar na tinitingnan, kabilang ang paligid ng pribadong pin. Maaaring ilagay ang coordinates nang hindi nilo-load ang mapa.",
    empty: "Wala pang pampublikong pin sa mapa.",
    failure:
      "Hindi ma-load ang mapa. Gamitin ang coordinates o listahan ng ulat sa ibaba.",
    migration:
      "Kailangan ng mapa ang migration 202611240009_service_operations.sql. Ipalapat ito sa administrador ng proyekto at i-reload.",
    error: "Hindi ma-load ang lokasyon. I-reload upang subukan muli.",
    setup:
      "Kailangan ng mapa ang Supabase project URL at publishable key. Ipa-configure ang mga ito sa administrador ng proyekto.",
    privateTitle: "Pribadong lokasyon ng ulat (opsyonal)",
    privateHint:
      "Ikaw at ang administrador lamang ang makakabasa ng eksaktong coordinates. Maglagay ng pares o pindutin ang opsyonal na mapa. Walang awtomatikong GPS lookup.",
    publicTitle: "Pampublikong pin sa mapa",
    publicHint:
      "Hiwalay na pumili ng tinatayang pampublikong lokasyon. Hindi kinokopya rito ang pribadong coordinates. Ni-round sa dalawang decimal ang ise-save. Ilathala muna ang inaprubahang ulat.",
    latitude: "Latitude",
    longitude: "Longitude",
    save: "I-save ang lokasyon",
    remove: "Alisin ang lokasyon",
    saving: "Sine-save...",
    saved: "Na-save ang lokasyon.",
    invalid:
      "Ilagay ang parehong coordinates: latitude -90 hanggang 90 at longitude -180 hanggang 180.",
    saveError:
      "Hindi ma-save. Suriin ang katayuan ng ulat at iyong access at subukang muli.",
    locked:
      "Maaaring baguhin ang lokasyon habang naghihintay ng pagsusuri o isinasagawa ang ulat.",
    pick: "Pindutin ang mapa upang pumili ng lokasyon. Maaari ring gamitin ang mga field.",
    open: "Buksan ang pampublikong ulat",
    list: "Mga inilathalang lokasyon",
    back: "Bumalik sa komunidad",
    limit: "Hanggang 200 pinakabagong inilathalang lokasyon ang ipinapakita.",
  },
};
export type MapLocale = keyof typeof mapText;
export type PublicMapIssue = {
  report_id: string;
  public_title: string;
  category: string;
  status: string;
  latitude: number;
  longitude: number;
};
