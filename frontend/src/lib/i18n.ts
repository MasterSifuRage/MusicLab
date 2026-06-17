export type Locale = "en" | "vi";

/** @deprecated Legacy global key — migrated to per-user / guest keys on read */
const LEGACY_LOCALE_KEY = "musiclab.locale";
export const LOCALE_GUEST_KEY = "musiclab.locale.guest";

export function localeStorageKey(userId: string | null | undefined): string {
  return userId ? `musiclab.locale.${userId}` : LOCALE_GUEST_KEY;
}

const dict = {
  en: {
    // Sidebar
    "nav.home": "Home",
    "nav.library": "Library",
    "nav.projects": "My Projects",
    "nav.settings": "Settings",
    "nav.logout": "Log Out",
    "nav.profile": "Profile",
    "nav.overview": "Overview",
    "nav.users": "User Management",
    "nav.reports": "Reported Content",
    "nav.logs": "System Logs",
    "nav.createProject": "Create Project",
    "nav.backDashboard": "Back to Dashboard",

    // Settings common
    "settings.title.creator": "Creator Settings",
    "settings.title.admin": "Admin Settings",
    "settings.subtitle.creator": "Customize your studio workflow and account preferences.",
    "settings.subtitle.admin": "Configure portal display, alerts, and administration defaults.",
    "settings.apply": "Save Changes",
    "settings.saved": "Settings saved.",
    "settings.saveError": "Could not save language preference.",
    "settings.language": "Interface Language",
    "settings.language.desc": "Choose your preferred interface language. Saved per account.",
    "settings.lang.en": "English",
    "settings.lang.vi": "Tiếng Việt",

    // Creator sections
    "settings.notifications": "Notifications",
    "settings.emailNotif": "Email Notifications",
    "settings.emailNotif.desc": "Updates about tracks, collaborations, and project invites.",
    "settings.privacy": "Project Privacy",
    "settings.privacy.desc": "Default visibility when creating a new project.",
    "settings.public": "Public",
    "settings.private": "Private",
    "settings.editor": "Studio Editor",
    "settings.snapGrid": "Snap to Grid",
    "settings.snapGrid.desc": "Align clips and MIDI notes to the timeline grid when dragging.",
    "settings.autoScroll": "Auto-scroll Playhead",
    "settings.autoScroll.desc": "Follow the playhead while playback is running.",
    "settings.hqPreview": "High-quality Preview",
    "settings.hqPreview.desc": "Use higher resolution waveforms in the editor (uses more CPU).",
    "settings.account": "Account",
    "settings.account.desc": "Manage profile, bio, and sign-in details.",
    "settings.openProfile": "Open Profile",

    // Admin sections
    "settings.adminAlerts": "Admin Alerts",
    "settings.adminAlerts.desc": "Email when new user reports or critical system events occur.",
    "settings.compactTables": "Compact Tables",
    "settings.compactTables.desc": "Show denser rows in user management and logs.",
    "settings.autoRefresh": "Auto-refresh Dashboard",
    "settings.autoRefresh.desc": "Reload overview stats every 60 seconds.",
    "settings.security": "Security",
    "settings.auditTrail": "Enhanced Audit Trail",
    "settings.auditTrail.desc": "Log additional admin actions for compliance review.",
    "settings.sessionNote": "Session timeout and 2FA are managed at the infrastructure level in production.",

    "common.on": "On",
    "common.off": "Off",

    // Profile
    "profile.title": "My Profile",
    "profile.subtitle": "Manage your public info and account details.",
    "profile.edit": "Edit Profile",
    "profile.save": "Save Changes",
    "profile.cancel": "Cancel",
    "profile.username": "Username",
    "profile.email": "Email Address",
    "profile.role": "Account Role",
    "profile.roleNote": "Contact admin to change",
    "profile.bio": "Bio",
    "profile.bioPlaceholder": "Tell us about yourself...",
    "profile.editCover": "Edit Cover",
    "profile.changeAvatar": "Change photo",
    "profile.projects": "Projects",
    "profile.memberSince": "Member since",
    "profile.openSettings": "Account Settings",
    "profile.updated": "Profile updated.",
    "profile.errorRequired": "Username and email cannot be empty.",
    "profile.role.creator": "Creator",
    "profile.role.admin": "Admin",
    "profile.inspiredBy": "Inspired by",
    "profile.talents": "Talents",
    "profile.genres": "Favorite genres",
    "profile.notSet": "Not set yet",
    "profile.addArtist": "Add artist name",
    "profile.addArtistBtn": "Add",
    "profile.talent.vocalist": "Vocalist",
    "profile.talent.songwriter": "Songwriter",
    "profile.talent.dj": "DJ/Beatmaker",
    "profile.talent.fan": "#1 Fan",
    "profile.talent.other": "Other",
    "profile.genre.pop": "Pop",
    "profile.genre.hiphop": "Hip Hop",
    "profile.genre.electronic": "Electronic",
    "profile.genre.kpop": "K-Pop",
    "profile.genre.lofi": "Lo-fi",
    "profile.genre.other": "Other",
    "profile.removeAvatar": "Remove photo",
    "profile.removeCover": "Remove cover",
    "profile.imageInvalid": "Please choose a JPG, PNG, WebP, or GIF image.",
    "profile.imageTooLarge": "Image is too large. Try a smaller file.",
    "profile.imageProcessing": "Processing image...",

    // Auth
    "auth.welcome": "Welcome Back",
    "auth.emailOrUsername": "Email or Username",
    "auth.password": "Password",
    "auth.forgotPassword": "Forgot Password?",
    "auth.login": "Log In",
    "auth.signup": "Sign Up",
    "auth.noAccount": "Don't have an account?",
    "auth.hasAccount": "Already have an account?",
    "auth.demoAccounts": "Demo Accounts",
    "auth.loginCreator": "Log in as Creator",
    "auth.loginAdmin": "Log in as Admin",
    "auth.errorIdentifier": "Please enter your email or username.",
    "auth.createAccount": "Create Account",

    // Landing
    "landing.login": "Log In",
    "landing.signup": "Sign Up",
    "landing.heroTitle": "The Web is Your",
    "landing.heroHighlight": "Studio",
    "landing.heroDesc": "Professional-grade digital audio workstation running entirely in your browser. Record, sequence, mix, and collaborate.",
    "landing.getStarted": "Get Started Free",
    "landing.exploreDemo": "Explore Demo",

    // Library
    "library.title": "Audio Library",
    "library.upload": "Upload Audio",
    "library.search": "Search files...",
    "library.quota": "Storage used",
    "library.samples": "Built-in Samples",
    "library.myUploads": "My Uploads",
    "library.quotaExceeded": "Storage quota exceeded (500 MB limit).",
  },
  vi: {
    "nav.home": "Trang chủ",
    "nav.library": "Thư viện",
    "nav.projects": "Dự án của tôi",
    "nav.settings": "Cài đặt",
    "nav.logout": "Đăng xuất",
    "nav.profile": "Hồ sơ",
    "nav.overview": "Tổng quan",
    "nav.users": "Quản lý người dùng",
    "nav.reports": "Nội dung báo cáo",
    "nav.logs": "Nhật ký hệ thống",
    "nav.createProject": "Tạo dự án",
    "nav.backDashboard": "Về Dashboard",

    "settings.title.creator": "Cài đặt Creator",
    "settings.title.admin": "Cài đặt Admin",
    "settings.subtitle.creator": "Tùy chỉnh quy trình làm nhạc và tài khoản của bạn.",
    "settings.subtitle.admin": "Cấu hình giao diện portal, cảnh báo và mặc định quản trị.",
    "settings.apply": "Lưu thay đổi",
    "settings.saved": "Đã lưu cài đặt.",
    "settings.saveError": "Không lưu được ngôn ngữ giao diện.",
    "settings.language": "Ngôn ngữ giao diện",
    "settings.language.desc": "Chọn ngôn ngữ giao diện. Lưu riêng theo từng tài khoản.",
    "settings.lang.en": "English",
    "settings.lang.vi": "Tiếng Việt",

    "settings.notifications": "Thông báo",
    "settings.emailNotif": "Thông báo Email",
    "settings.emailNotif.desc": "Cập nhật về track, cộng tác và lời mời dự án.",
    "settings.privacy": "Quyền riêng tư dự án",
    "settings.privacy.desc": "Chế độ hiển thị mặc định khi tạo dự án mới.",
    "settings.public": "Công khai",
    "settings.private": "Riêng tư",
    "settings.editor": "Studio Editor",
    "settings.snapGrid": "Snap lưới Timeline",
    "settings.snapGrid.desc": "Căn clip và nốt MIDI theo lưới khi kéo thả.",
    "settings.autoScroll": "Tự cuộn theo Playhead",
    "settings.autoScroll.desc": "Theo dõi vị trí phát khi đang playback.",
    "settings.hqPreview": "Xem trước chất lượng cao",
    "settings.hqPreview.desc": "Waveform chi tiết hơn trong editor (tốn CPU hơn).",
    "settings.account": "Tài khoản",
    "settings.account.desc": "Quản lý hồ sơ, bio và thông tin đăng nhập.",
    "settings.openProfile": "Mở hồ sơ",

    "settings.adminAlerts": "Cảnh báo Admin",
    "settings.adminAlerts.desc": "Email khi có báo cáo người dùng hoặc sự cố hệ thống.",
    "settings.compactTables": "Bảng gọn",
    "settings.compactTables.desc": "Hiển thị dòng dày hơn trong quản lý user và logs.",
    "settings.autoRefresh": "Tự làm mới Dashboard",
    "settings.autoRefresh.desc": "Tải lại thống kê tổng quan mỗi 60 giây.",
    "settings.security": "Bảo mật",
    "settings.auditTrail": "Audit Trail mở rộng",
    "settings.auditTrail.desc": "Ghi thêm hành động admin để đối soát.",
    "settings.sessionNote": "Timeout phiên và 2FA được quản lý ở tầng hạ tầng khi production.",

    "common.on": "Bật",
    "common.off": "Tắt",

    "profile.title": "Hồ sơ của tôi",
    "profile.subtitle": "Quản lý thông tin công khai và chi tiết tài khoản.",
    "profile.edit": "Chỉnh sửa hồ sơ",
    "profile.save": "Lưu thay đổi",
    "profile.cancel": "Hủy",
    "profile.username": "Tên người dùng",
    "profile.email": "Địa chỉ email",
    "profile.role": "Vai trò tài khoản",
    "profile.roleNote": "Liên hệ admin để thay đổi",
    "profile.bio": "Giới thiệu",
    "profile.bioPlaceholder": "Giới thiệu về bản thân...",
    "profile.editCover": "Đổi ảnh bìa",
    "profile.changeAvatar": "Đổi ảnh",
    "profile.projects": "Dự án",
    "profile.memberSince": "Tham gia từ",
    "profile.openSettings": "Cài đặt tài khoản",
    "profile.updated": "Đã cập nhật hồ sơ.",
    "profile.errorRequired": "Tên người dùng và email không được để trống.",
    "profile.role.creator": "Creator",
    "profile.role.admin": "Quản trị viên",
    "profile.inspiredBy": "Lấy cảm hứng từ",
    "profile.talents": "Tài năng",
    "profile.genres": "Thể loại yêu thích",
    "profile.notSet": "Chưa chọn",
    "profile.addArtist": "Thêm tên nghệ sĩ",
    "profile.addArtistBtn": "Thêm",
    "profile.talent.vocalist": "Ca sĩ",
    "profile.talent.songwriter": "Nhạc sĩ",
    "profile.talent.dj": "DJ/Beatmaker",
    "profile.talent.fan": "Fan cứng",
    "profile.talent.other": "Khác",
    "profile.genre.pop": "Pop",
    "profile.genre.hiphop": "Hip Hop",
    "profile.genre.electronic": "Electronic",
    "profile.genre.kpop": "K-Pop",
    "profile.genre.lofi": "Lo-fi",
    "profile.genre.other": "Khác",
    "profile.removeAvatar": "Xóa ảnh",
    "profile.removeCover": "Xóa ảnh bìa",
    "profile.imageInvalid": "Vui lòng chọn ảnh JPG, PNG, WebP hoặc GIF.",
    "profile.imageTooLarge": "Ảnh quá lớn. Hãy thử file nhỏ hơn.",
    "profile.imageProcessing": "Đang xử lý ảnh...",

    "auth.welcome": "Chào mừng trở lại",
    "auth.emailOrUsername": "Email hoặc tên người dùng",
    "auth.password": "Mật khẩu",
    "auth.forgotPassword": "Quên mật khẩu?",
    "auth.login": "Đăng nhập",
    "auth.signup": "Đăng ký",
    "auth.noAccount": "Chưa có tài khoản?",
    "auth.hasAccount": "Đã có tài khoản?",
    "auth.demoAccounts": "Tài khoản demo",
    "auth.loginCreator": "Đăng nhập Creator",
    "auth.loginAdmin": "Đăng nhập Admin",
    "auth.errorIdentifier": "Vui lòng nhập email hoặc tên người dùng.",
    "auth.createAccount": "Tạo tài khoản",

    "landing.login": "Đăng nhập",
    "landing.signup": "Đăng ký",
    "landing.heroTitle": "Web là",
    "landing.heroHighlight": "Studio",
    "landing.heroDesc": "DAW chuyên nghiệp chạy hoàn toàn trên trình duyệt. Thu âm, sắp xếp, mix và cộng tác.",
    "landing.getStarted": "Bắt đầu miễn phí",
    "landing.exploreDemo": "Xem demo",

    "library.title": "Thư viện âm thanh",
    "library.upload": "Tải lên audio",
    "library.search": "Tìm file...",
    "library.quota": "Dung lượng đã dùng",
    "library.samples": "Sample tích hợp",
    "library.myUploads": "File đã tải lên",
    "library.quotaExceeded": "Vượt quá dung lượng (giới hạn 500 MB).",
  },
} as const;

export type I18nKey = keyof typeof dict.en;

export function t(locale: Locale, key: I18nKey): string {
  return dict[locale][key] ?? dict.en[key] ?? key;
}

export function localeFromProfileMeta(meta?: { locale?: string } | null): Locale | null {
  if (meta?.locale === "vi" || meta?.locale === "en") return meta.locale;
  return null;
}

function readLocaleKey(key: string): Locale | null {
  try {
    const v = localStorage.getItem(key);
    if (v === "vi" || v === "en") return v;
  } catch {
    /* noop */
  }
  return null;
}

function migrateLegacyLocale(targetKey: string): Locale | null {
  const legacy = readLocaleKey(LEGACY_LOCALE_KEY);
  if (!legacy) return null;
  try {
    localStorage.setItem(targetKey, legacy);
    localStorage.removeItem(LEGACY_LOCALE_KEY);
  } catch {
    /* noop */
  }
  return legacy;
}

export function getStoredLocale(userId?: string | null): Locale {
  const key = localeStorageKey(userId);
  return readLocaleKey(key) ?? migrateLegacyLocale(key) ?? "en";
}

export function setStoredLocale(locale: Locale, userId?: string | null) {
  try {
    localStorage.setItem(localeStorageKey(userId), locale);
    document.documentElement.lang = locale;
  } catch {
    /* noop */
  }
}

export function resolveLocale(opts: {
  userId?: string | null;
  profileMeta?: { locale?: string } | null;
}): Locale {
  return localeFromProfileMeta(opts.profileMeta) ?? getStoredLocale(opts.userId);
}
