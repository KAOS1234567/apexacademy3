export const playersDict = {
  ar: {
    title: "اللاعبين", count: "لاعب", addPlayer: "إضافة لاعب",
    searchPlaceholder: "ابحث بالاسم...", allTeams: "كل الفرق", noTeam: "بدون فريق",
    allStatuses: "كل الحالات", active: "نشط", inactive: "غير نشط", trial: "تجريبي",
    noPlayers: "لا يوجد لاعبين بعد", noPlayersDesc: "ابدأ بإضافة أول لاعب في أكاديميتك",
    emptyFilter: "لا يوجد لاعبون مطابقون للفلترة",
    colPlayer: "اللاعب", colTeam: "الفريق", colPosition: "المركز", colNumber: "الرقم", colStatus: "الحالة",
    showingOf: "من", clearFilters: "مسح الفلاتر", results: "النتائج", playersWord: "لاعب",
  },
  ku: {
    title: "یاریزانەکان", count: "یاریزان", addPlayer: "زیادکردنی یاریزان",
    searchPlaceholder: "گەڕان بە ناو...", allTeams: "هەموو تیمەکان", noTeam: "بێ تیم",
    allStatuses: "هەموو دۆخەکان", active: "چالاک", inactive: "ناچالاک", trial: "تاقیکاری",
    noPlayers: "هیچ یاریزانێک نییە", noPlayersDesc: "یەکەم یاریزان زیاد بکە",
    emptyFilter: "هیچ یاریزانێکی گونجاو نییە",
    colPlayer: "یاریزان", colTeam: "تیم", colPosition: "پێگە", colNumber: "ژمارە", colStatus: "دۆخ",
    showingOf: "لە", clearFilters: "سڕینەوەی فلتەرەکان", results: "ئەنجامەکان", playersWord: "یاریزان",
  },
  en: {
    title: "Players", count: "players", addPlayer: "Add Player",
    searchPlaceholder: "Search by name...", allTeams: "All Teams", noTeam: "No Team",
    allStatuses: "All Statuses", active: "Active", inactive: "Inactive", trial: "Trial",
    noPlayers: "No players yet", noPlayersDesc: "Start by adding your first player",
    emptyFilter: "No players match the filters",
    colPlayer: "Player", colTeam: "Team", colPosition: "Position", colNumber: "Number", colStatus: "Status",
    showingOf: "of", clearFilters: "Clear filters", results: "Results", playersWord: "players",
  },
  es: {
    title: "Jugadores", count: "jugadores", addPlayer: "Añadir Jugador",
    searchPlaceholder: "Buscar por nombre...", allTeams: "Todos los Equipos", noTeam: "Sin Equipo",
    allStatuses: "Todos los Estados", active: "Activo", inactive: "Inactivo", trial: "Prueba",
    noPlayers: "Aún no hay jugadores", noPlayersDesc: "Comienza añadiendo tu primer jugador",
    emptyFilter: "Ningún jugador coincide con los filtros",
    colPlayer: "Jugador", colTeam: "Equipo", colPosition: "Posición", colNumber: "Número", colStatus: "Estado",
    showingOf: "de", clearFilters: "Limpiar filtros", results: "Resultados", playersWord: "jugadores",
  },
};
export type PlayersDict = typeof playersDict.ar;
