// ===== ICON RENDERER — npm lucide, no CDN =====
import {
  LayoutDashboard, Users, User, GitBranch, Headphones, GraduationCap,
  PieChart, Landmark, CalendarCheck, Calendar, FileText, Megaphone,
  TrendingUp, TrendingDown, HelpCircle, IndianRupee, LayoutTemplate,
  Settings, Search, Bell, BellOff, Plus, Menu, ChevronRight, ChevronLeft,
  ChevronDown, ChevronUp, LogOut, ArrowUpDown, Eye, EyeOff, ArrowRightCircle,
  Trash2, Download, Upload, UserPlus, UserMinus, UserCheck, UserX,
  Edit2, Edit3, Star, Mail, Phone, Building2, Building, Check, X,
  MoreVertical, GripVertical, Inbox, Target, Clock, AlarmClock,
  Construction, AlertTriangle, AlertCircle, Filter, CheckCircle,
  FileCheck, MessageCircle, MessageSquare, BarChart2, Activity,
  RefreshCw, Webhook, Lock, Unlock, Grid, Info, Copy, ExternalLink,
  Link, Globe, MapPin, Navigation, Compass, Map, Flag, Shield, Key,
  Home, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ArrowUpRight,
  ArrowDownRight, ArrowUpLeft, ArrowDownLeft, ChevronsLeft, ChevronsRight,
  Send, Play, Pause, Camera, Mic, MicOff, Sun, Moon, Cloud, Wind,
  Battery, BatteryCharging, Power, ToggleLeft, ToggleRight, Sliders,
  SlidersHorizontal, Gauge, Timer, Newspaper, School, Microscope,
  Pill, Stethoscope, Heart, HeartPulse, ShoppingCart, ShoppingBag,
  Store, Gift, Ticket, Receipt, Wallet, PiggyBank, Coins, Banknote,
  DollarSign, CreditCard, Package, Tag, Bookmark, Share2, Image,
  Video, VideoOff, Music, File, Folder, FolderOpen, Database, Server,
  Cpu, Monitor, Smartphone, Tablet, Wifi, Bluetooth, Printer, Scan,
  QrCode, Barcode, Layers, Award, Zap, GitMerge, BookOpen, Book,
  Pen, PenTool, Scissors, Crop, ZoomIn, ZoomOut, Maximize, Minimize,
  RotateCw, RotateCcw, AlignLeft, AlignCenter, AlignRight, List,
  Table, Move, MousePointer, Type, Hash, AtSign, Percent, Minus,
  Asterisk, Equal, CornerDownLeft, CornerDownRight, CornerUpLeft,
  CornerUpRight, CheckSquare, Square, BarChart, LineChart, AreaChart,
  ScatterChart, Briefcase, Flame, Snowflake, Umbrella, Droplets,
  Thermometer, Rainbow, Sunrise, Sunset, CloudRain, CloudSnow,
  BatteryFull, BatteryLow, PowerOff, Hourglass, CalendarDays,
  CalendarPlus, CalendarMinus, CalendarX, CalendarCheck2, Watch,
  BookMarked, BookCopy, BookX, BookPlus, BookMinus, BookLock,
  BookKey, BookHeart, BookText, BookUser, Library, University,
  FlaskConical, TestTube, Atom, Dna, Syringe, Bandage, Cross,
  Package2, AreaChart as AreaChart2, Radio, Podcast, Rss,
  Volume, Volume1, Volume2, VolumeX, Rewind, FastForward,
  Speaker, Film, Tv, LayoutGrid, Columns, Rows, Sidebar,
  PanelLeft, PanelRight, SplitSquareHorizontal, SplitSquareVertical,
  Grab, Hand, Divide, AlignJustify, Grid3x3, FlipHorizontal,
  FlipVertical, RotateCcw as RotateCcw2
} from 'lucide';

const allIcons = {
  LayoutDashboard, Users, User, GitBranch, Headphones, GraduationCap,
  PieChart, Landmark, CalendarCheck, Calendar, FileText, Megaphone,
  TrendingUp, TrendingDown, HelpCircle, IndianRupee, LayoutTemplate,
  Settings, Search, Bell, BellOff, Plus, Menu, ChevronRight, ChevronLeft,
  ChevronDown, ChevronUp, LogOut, ArrowUpDown, Eye, EyeOff, ArrowRightCircle,
  Trash2, Download, Upload, UserPlus, UserMinus, UserCheck, UserX,
  Edit2, Edit3, Star, Mail, Phone, Building2, Building, Check, X,
  MoreVertical, GripVertical, Inbox, Target, Clock, AlarmClock,
  Construction, AlertTriangle, AlertCircle, Filter, CheckCircle,
  FileCheck, MessageCircle, MessageSquare, BarChart2, Activity,
  RefreshCw, Webhook, Lock, Unlock, Grid, Info, Copy, ExternalLink,
  Link, Globe, MapPin, Navigation, Compass, Map, Flag, Shield, Key,
  Home, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ArrowUpRight,
  ArrowDownRight, ArrowUpLeft, ArrowDownLeft, ChevronsLeft, ChevronsRight,
  Send, Play, Pause, Camera, Mic, MicOff, Sun, Moon, Cloud, Wind,
  Battery, BatteryCharging, Power, ToggleLeft, ToggleRight, Sliders,
  SlidersHorizontal, Gauge, Timer, Newspaper, School, Microscope,
  Pill, Stethoscope, Heart, HeartPulse, ShoppingCart, ShoppingBag,
  Store, Gift, Ticket, Receipt, Wallet, PiggyBank, Coins, Banknote,
  DollarSign, CreditCard, Package, Tag, Bookmark, Share2, Image,
  Video, VideoOff, Music, File, Folder, FolderOpen, Database, Server,
  Cpu, Monitor, Smartphone, Tablet, Wifi, Bluetooth, Printer, Scan,
  QrCode, Barcode, Layers, Award, Zap, GitMerge, BookOpen, Book,
  Pen, PenTool, Scissors, Crop, ZoomIn, ZoomOut, Maximize, Minimize,
  RotateCw, RotateCcw, AlignLeft, AlignCenter, AlignRight, List,
  Table, Move, MousePointer, Type, Hash, AtSign, Percent, Minus,
  Asterisk, Equal, CornerDownLeft, CornerDownRight, CornerUpLeft,
  CornerUpRight, CheckSquare, Square, BarChart, LineChart, AreaChart,
  ScatterChart, Briefcase, Flame, Snowflake, Umbrella, Droplets,
  Thermometer, Rainbow, Sunrise, Sunset, CloudRain, CloudSnow,
  BatteryFull, BatteryLow, PowerOff, Hourglass, CalendarDays,
  CalendarPlus, CalendarMinus, CalendarX, CalendarCheck2, Watch,
  BookMarked, BookCopy, BookX, BookPlus, BookMinus, BookLock,
  BookKey, BookHeart, BookText, BookUser, Library, University,
  FlaskConical, TestTube, Atom, Dna, Syringe, Bandage, Cross,
  Package2, Radio, Podcast, Rss, Volume, Volume1, Volume2, VolumeX,
  Rewind, FastForward, Speaker, Film, Tv, LayoutGrid, Columns,
  Rows, Sidebar, PanelLeft, PanelRight, SplitSquareHorizontal,
  SplitSquareVertical, Grab, Hand, Divide, AlignJustify, Grid3x3,
  FlipHorizontal, FlipVertical
};

// Convert PascalCase → kebab-case
function toKebab(s) {
  return s.replace(/([A-Z])/g, (m, l, i) => (i > 0 ? '-' : '') + l.toLowerCase());
}

// Build icon map
const iconMap = {};
Object.entries(allIcons).forEach(([name, data]) => {
  if (data) iconMap[toKebab(name)] = data;
});

// Build SVG string from lucide icon data
function buildSvg(data, w, h, extraStyle) {
  const inner = data.map(([tag, props]) => {
    const attrs = Object.entries(props || {}).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<${tag} ${attrs}/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;${extraStyle}">${inner}</svg>`;
}

// Replace all <i data-lucide="name"> with inline SVG
export function createIcons(root) {
  const el = root || document;
  el.querySelectorAll('i[data-lucide]').forEach(i => {
    const name = i.getAttribute('data-lucide');
    const data = iconMap[name];
    if (!data) return;
    const style = i.getAttribute('style') || '';
    const wm = style.match(/width:\s*([\d.]+)px/);
    const hm = style.match(/height:\s*([\d.]+)px/);
    const w = wm ? wm[1] : '20';
    const h = hm ? hm[1] : '20';
    // Keep other styles but remove width/height (handled by SVG attrs)
    const cleanStyle = style.replace(/width:[^;]+;?/g, '').replace(/height:[^;]+;?/g, '');
    const svg = buildSvg(data, w, h, cleanStyle);
    i.outerHTML = svg;
  });
}

window.renderIcons = () => createIcons(document);
