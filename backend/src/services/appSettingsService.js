import { AppSettings } from "../models/AppSettings.js";
import { sequelize } from "../database/connection.js";
import { DataTypes } from "sequelize";
import fs from "fs";
import path from "path";
import fileDirName from "../libs/file-dirname.js";

const { __dirname } = fileDirName(import.meta);
const IMG_BASE = path.resolve(__dirname, "../img");

export const DEFAULT_APP_SETTINGS = {
  id: 1,
  name: "Raptor",
  alias: "Raptor",
  version: "1.0.0",
  description: "Aplicación sin configurar. Definí nombre, logo y opciones en Sistema → Configuración.",
  author: "Raptor",
  logoPath: null,
  iconPath: null,
  phone: "",
  socialWhatsapp: "",
  socialFacebook: "",
  socialInstagram: "",
  socialTiktok: "",
  socialEmail: "",
  mediaFolderPrefix: "sistema",
  cajaQuickCategoryMatch: "",
  walkInCustomerLabel: "Consumidor Final",
  timezone: "America/Guayaquil",
  showPublicCatalog: false,
  showPublicStoresPropia: false,
  showPublicStoresVitrina: false,
};

let cache = { ...DEFAULT_APP_SETTINGS };

export function getAppSettingsSync() {
  return cache;
}

export function mediaFolderPrefix() {
  const p = String(cache.mediaFolderPrefix || "sistema").trim() || "sistema";
  return p.replace(/\/+$/, "");
}

export function mediaSubfolder(...parts) {
  const segs = [mediaFolderPrefix(), ...parts].filter(Boolean);
  return segs.join("/");
}

export function logosFolder() {
  return mediaSubfolder("logos");
}

export function iconsFolder() {
  return mediaSubfolder("icons");
}

export function qrFolder() {
  return mediaSubfolder("qr");
}

export function defaultLogoPath(prefix = mediaFolderPrefix()) {
  return `${prefix}/logos/logo.jpeg`;
}

export function defaultIconPath(prefix = mediaFolderPrefix()) {
  return `${prefix}/icons/icon.jpeg`;
}

function ensureDirRel(rel) {
  if (!rel) return;
  fs.mkdirSync(path.join(IMG_BASE, rel), { recursive: true });
}

/** Carpetas estándar: {prefix}/logos, {prefix}/icons y {prefix}/qr */
export function ensureStandardAssetDirs(prefix = mediaFolderPrefix()) {
  ensureDirRel(`${prefix}/logos`);
  ensureDirRel(`${prefix}/icons`);
  ensureDirRel(`${prefix}/qr`);
}

async function migrateSettingsRow(row) {
  const prefix = String(row.mediaFolderPrefix || "sistema").trim() || "sistema";
  const patch = {};

  const alias = String(row.alias || "").trim();
  const name = String(row.name || "").trim();
  const author = String(row.author || "").trim();
  const stillEddeliTemplate =
    /^eddeli$/i.test(alias) ||
    /eddeli/i.test(name) ||
    /panader/i.test(name) ||
    /^softed$/i.test(author);

  // Clonado desde EdDeli: volver a plantilla Raptor sin configurar.
  if (stillEddeliTemplate) {
    Object.assign(patch, {
      name: DEFAULT_APP_SETTINGS.name,
      alias: DEFAULT_APP_SETTINGS.alias,
      description: DEFAULT_APP_SETTINGS.description,
      author: DEFAULT_APP_SETTINGS.author,
      logoPath: null,
      iconPath: null,
      phone: "",
      socialWhatsapp: "",
      socialFacebook: "",
      socialInstagram: "",
      socialTiktok: "",
      socialEmail: "",
      cajaQuickCategoryMatch: "",
      showPublicCatalog: false,
      showPublicStoresPropia: false,
      showPublicStoresVitrina: false,
    });
  } else if (
    row.logoPath === `${prefix}/logo.jpeg` ||
    row.logoPath === "EdDeli/logo.jpeg" ||
    row.logoPath === "EdDeli/logos/logo.jpeg"
  ) {
    patch.logoPath = null;
  }

  const tz = row.timezone != null ? String(row.timezone).trim() : "";
  if (!tz) {
    patch.timezone = DEFAULT_APP_SETTINGS.timezone;
  }

  if (Object.keys(patch).length) {
    await row.update(patch);
    Object.assign(row, patch);
  }

  ensureStandardAssetDirs(prefix);
  return row;
}

export function getMediaFolders() {
  const p = mediaFolderPrefix();
  return {
    video: [`${p}/media`, `${p}/videos`, "videos", "publicidad/videos"],
    audio: [`${p}/media`, `${p}/audio`, `${p}/music`, "publicidad/audio"],
    image: [`${p}/publicidad`, `${p}/ads`, `${p}/banners`],
  };
}

async function ensureAppSettingsSchema() {
  const qi = sequelize.getQueryInterface();
  let table;
  try {
    table = await qi.describeTable("app_settings");
  } catch {
    return;
  }
  if (!table.timezone) {
    await qi.addColumn("app_settings", "timezone", {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: "America/Guayaquil",
    });
  }
  if (!table.iconPath) {
    await qi.addColumn("app_settings", "iconPath", {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    });
  }
  const boolCols = [
    ["showPublicCatalog", false],
    ["showPublicStoresPropia", false],
    ["showPublicStoresVitrina", false],
  ];
  for (const [col, def] of boolCols) {
    if (!table[col]) {
      await qi.addColumn("app_settings", col, {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: def,
      });
    }
  }
}

function asBool(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const s = String(value).trim().toLowerCase();
  if (["0", "false", "no", "off"].includes(s)) return false;
  if (["1", "true", "yes", "on"].includes(s)) return true;
  return fallback;
}

export async function loadAppSettings() {
  await ensureAppSettingsSchema();
  await AppSettings.sync();
  let row = await AppSettings.findByPk(1);
  if (!row) {
    row = await AppSettings.create({ id: 1, ...DEFAULT_APP_SETTINGS });
  }
  row = await migrateSettingsRow(row);
  const raw = row.toJSON();
  cache = {
    ...DEFAULT_APP_SETTINGS,
    ...raw,
    showPublicCatalog: asBool(raw.showPublicCatalog, false),
    showPublicStoresPropia: asBool(raw.showPublicStoresPropia, false),
    showPublicStoresVitrina: asBool(raw.showPublicStoresVitrina, false),
  };
  ensureStandardAssetDirs(cache.mediaFolderPrefix);
  return cache;
}

export async function updateAppSettings(payload) {
  const patch = { ...payload };
  for (const key of [
    "showPublicCatalog",
    "showPublicStoresPropia",
    "showPublicStoresVitrina",
  ]) {
    if (key in patch) patch[key] = asBool(patch[key], false);
  }
  let row = await AppSettings.findByPk(1);
  if (!row) {
    row = await AppSettings.create({ id: 1, ...DEFAULT_APP_SETTINGS, ...patch });
  } else {
    await row.update(patch);
  }
  const raw = row.toJSON();
  cache = {
    ...DEFAULT_APP_SETTINGS,
    ...raw,
    showPublicCatalog: asBool(raw.showPublicCatalog, false),
    showPublicStoresPropia: asBool(raw.showPublicStoresPropia, false),
    showPublicStoresVitrina: asBool(raw.showPublicStoresVitrina, false),
  };
  return cache;
}

export function toPublicSettings(data = cache) {
  return {
    name: data.name,
    alias: data.alias,
    version: data.version,
    description: data.description,
    author: data.author,
    logoPath: data.logoPath,
    iconPath: data.iconPath,
    phone: data.phone,
    socials: {
      whatsapp: data.socialWhatsapp || "",
      facebook: data.socialFacebook || "",
      instagram: data.socialInstagram || "",
      tiktok: data.socialTiktok || "",
      email: data.socialEmail || "",
    },
    mediaFolderPrefix: data.mediaFolderPrefix,
    logoFolder: logosFolder(),
    iconFolder: iconsFolder(),
    qrFolder: qrFolder(),
    cajaQuickCategoryMatch: data.cajaQuickCategoryMatch || "",
    walkInCustomerLabel: data.walkInCustomerLabel || "Consumidor Final",
    timezone: data.timezone || "America/Guayaquil",
    showPublicCatalog: asBool(data.showPublicCatalog, false),
    showPublicStoresPropia: asBool(data.showPublicStoresPropia, false),
    showPublicStoresVitrina: asBool(data.showPublicStoresVitrina, false),
  };
}
