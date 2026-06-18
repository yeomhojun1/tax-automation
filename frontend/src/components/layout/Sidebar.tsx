import { NavLink } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';

interface NavItem {
  to: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: '대시보드' },
  { to: '/invoices', label: '세금계산서' },
  { to: '/expenses', label: '경비관리' },
  { to: '/report', label: '부가세 리포트' },
  { to: '/profile', label: '프로필 설정' },
];

export default function Sidebar(): JSX.Element {
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-56 min-h-screen bg-gray-900 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-700">
        <h1 className="text-white font-bold text-lg">세금계산서 관리</h1>
      </div>

      <nav className="flex-1 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700">
        <p className="text-gray-400 text-xs mb-1">{user?.businessName}</p>
        <p className="text-gray-500 text-xs mb-3">{user?.email}</p>
        <button
          onClick={logout}
          className="w-full text-gray-400 hover:text-white text-sm py-1.5 rounded hover:bg-gray-800 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
