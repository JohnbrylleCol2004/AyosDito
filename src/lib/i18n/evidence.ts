export const enEvidence = {
  loadError:
    "We couldn’t load private evidence. Refresh or ask your administrator to verify the Phase 4 setup.",
  title: "Photo evidence",
  reportPhotos: "Resident photos",
  resolutionPhotos: "Official resolution history",
  resolutionHint:
    "Photos added by barangay staff as part of the official record.",
  pickerLabel: "Add photos (optional)",
  hint: "JPEG, PNG or WebP · up to 3 photos · 5 MiB each. Avoid including faces or personal information.",
  privateHint:
    "Photos are private and visible only to the report owner and authorized barangay staff.",
  selected: "Selected photo",
  remove: "Remove",
  upload: "Upload photos",
  uploading: "Uploading…",
  uploaded: "Photos uploaded.",
  empty: "No photos on this page.",
  refreshHint:
    "Private photo links expire after 2 minutes. Refresh photos if an image is unavailable.",
  refresh: "Refresh photos",
  unavailable: "Photo unavailable. Refresh to request a new private link.",
  view: "View full photo",
  previous: "Previous",
  next: "Next",
  page: "Photo page",
  of: "of",
  full: "This report already has the maximum of 3 resident photos.",
  photoError:
    "Your report was saved, but some photos could not be uploaded. Open the saved report to check photos and try again there.",
  savedReport: "Open saved report",
  errors: {
    fileType: "Choose only JPEG, PNG or WebP photos.",
    fileSize: "Each photo must be no larger than 5 MiB.",
    fileContent:
      "A photo could not be read as a supported image. Choose another photo.",
    fileCount: "Choose no more than the available number of photos (up to 3).",
    permission: "You do not have permission to add these photos.",
    closed: "Photos can no longer be added to this report.",
    storage: "Photos could not be stored. Please try again.",
    config: "Photo uploads are not available yet. Contact your administrator.",
    limit:
      "This report has reached its resident photo limit. Refresh to see the latest photos.",
    expired:
      "Your session or upload request expired. Refresh the page and try again.",
    uploadFailed:
      "The upload could not be completed. Your selection is preserved; try again.",
    csrf: "The request could not be verified. Reload the page and try again.",
    server: "Photos could not be uploaded. Please try again.",
  },
};

export type EvidenceDictionary = {
  [Key in keyof typeof enEvidence]: Key extends "errors"
    ? { [Code in keyof typeof enEvidence.errors]: string }
    : string;
};

export const filEvidence: EvidenceDictionary = {
  loadError:
    "Hindi ma-load ang pribadong ebidensya. I-refresh o ipasuri sa administrator ang Phase 4 setup.",
  title: "Mga larawang ebidensya",
  reportPhotos: "Mga larawan ng residente",
  resolutionPhotos: "Opisyal na kasaysayan ng resolusyon",
  resolutionHint:
    "Mga larawang idinagdag ng kawani ng barangay bilang bahagi ng opisyal na tala.",
  pickerLabel: "Magdagdag ng larawan (opsyonal)",
  hint: "JPEG, PNG o WebP · hanggang 3 larawan · 5 MiB bawat isa. Iwasang isama ang mukha o personal na impormasyon.",
  privateHint:
    "Pribado ang mga larawan at makikita lamang ng may-ari ng ulat at awtorisadong kawani ng barangay.",
  selected: "Napiling larawan",
  remove: "Alisin",
  upload: "I-upload ang mga larawan",
  uploading: "Ina-upload…",
  uploaded: "Na-upload na ang mga larawan.",
  empty: "Walang larawan sa pahinang ito.",
  refreshHint:
    "Napapaso ang pribadong link ng larawan pagkalipas ng 2 minuto. I-refresh ang mga larawan kung hindi na makita ang mga ito.",
  refresh: "I-refresh ang mga larawan",
  unavailable:
    "Hindi makita ang larawan. I-refresh upang humiling ng bagong pribadong link.",
  view: "Tingnan ang buong larawan",
  previous: "Nakaraan",
  next: "Susunod",
  page: "Pahina ng larawan",
  of: "sa",
  full: "Mayroon nang pinakamataas na 3 larawan ng residente ang ulat na ito.",
  photoError:
    "Na-save ang iyong ulat, ngunit hindi na-upload ang ilang larawan. Buksan ang na-save na ulat upang tingnan ang mga larawan at subukang muli roon.",
  savedReport: "Buksan ang na-save na ulat",
  errors: {
    fileType: "Pumili lamang ng JPEG, PNG o WebP na larawan.",
    fileSize: "Hindi dapat lumampas sa 5 MiB ang bawat larawan.",
    fileContent:
      "Hindi mabasa bilang suportadong larawan ang isang file. Pumili ng ibang larawan.",
    fileCount: "Pumili lamang ayon sa natitirang puwang (hanggang 3 larawan).",
    permission: "Wala kang pahintulot na idagdag ang mga larawang ito.",
    closed: "Hindi na maaaring magdagdag ng larawan sa ulat na ito.",
    storage: "Hindi naimbak ang mga larawan. Pakisubukang muli.",
    config:
      "Hindi pa handa ang pag-upload ng larawan. Makipag-ugnayan sa tagapangasiwa.",
    limit:
      "Naabot na ang limitasyon ng larawan ng residente. I-refresh upang makita ang pinakabagong mga larawan.",
    expired:
      "Napaso ang iyong session o kahilingan. I-refresh ang pahina at subukang muli.",
    uploadFailed:
      "Hindi natapos ang pag-upload. Nananatili ang iyong napili; subukang muli.",
    csrf: "Hindi mapatunayan ang kahilingan. I-reload ang pahina at subukang muli.",
    server: "Hindi na-upload ang mga larawan. Pakisubukang muli.",
  },
};
