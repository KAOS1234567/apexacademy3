export type Locale = "ar" | "ku" | "en" | "es";

export const LOCALES: { code: Locale; name: string; dir: "rtl" | "ltr"; flag: string }[] = [
  { code: "ar", name: "العربية", dir: "rtl", flag: "🇮🇶" },
  { code: "ku", name: "کوردی", dir: "rtl", flag: "🏴" },
  { code: "en", name: "English", dir: "ltr", flag: "🇬🇧" },
  { code: "es", name: "Español", dir: "ltr", flag: "🇪🇸" },
];

export const dictionaries = {
  ar: {
    common: { appName: "Campo", save: "حفظ", cancel: "إلغاء", delete: "حذف", edit: "تعديل", add: "إضافة", loading: "جاري التحميل...", back: "رجوع", search: "بحث", language: "اللغة" },
    nav: { home: "الرئيسية", players: "اللاعبين", teams: "الفرق", staff: "المدربين", schedule: "الجدول", matches: "المباريات", leagues: "الدوريات", reports: "التقارير", settings: "الإعدادات", logout: "تسجيل الخروج" },
  },
  ku: {
    common: { appName: "Campo", save: "پاشەکەوتکردن", cancel: "هەڵوەشاندن", delete: "سڕینەوە", edit: "دەستکاریکردن", add: "زیادکردن", loading: "بارکردن...", back: "گەڕانەوە", search: "گەڕان", language: "زمان" },
    nav: { home: "سەرەکی", players: "یاریزانەکان", teams: "تیمەکان", staff: "ڕاهێنەرەکان", schedule: "خشتە", matches: "یارییەکان", leagues: "خولەکان", reports: "ڕاپۆرتەکان", settings: "ڕێکخستنەکان", logout: "چوونەدەرەوە" },
  },
  en: {
    common: { appName: "Campo", save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", add: "Add", loading: "Loading...", back: "Back", search: "Search", language: "Language" },
    nav: { home: "Home", players: "Players", teams: "Teams", staff: "Staff", schedule: "Schedule", matches: "Matches", leagues: "Leagues", reports: "Reports", settings: "Settings", logout: "Logout" },
  },
  es: {
    common: { appName: "Campo", save: "Guardar", cancel: "Cancelar", delete: "Eliminar", edit: "Editar", add: "Añadir", loading: "Cargando...", back: "Volver", search: "Buscar", language: "Idioma" },
    nav: { home: "Inicio", players: "Jugadores", teams: "Equipos", staff: "Cuerpo", schedule: "Calendario", matches: "Partidos", leagues: "Ligas", reports: "Informes", settings: "Ajustes", logout: "Salir" },
  },
};

export function getDirection(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" || locale === "ku" ? "rtl" : "ltr";
}
