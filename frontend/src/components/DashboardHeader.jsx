import { Fragment, useEffect, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ShieldAlert, User, Settings, LogOut, ChevronDown } from 'lucide-react';

const DashboardHeader = () => {
  const [userName, setUserName] = useState('Admin');

  useEffect(() => {
    const name = localStorage.getItem('userName');
    if (name) setUserName(name);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    window.location.href = '/'; 
  };

  return (
    // Nền tối, kính mờ, viền dưới phát sáng nhẹ
    <header className="bg-slate-900/80 backdrop-blur-md shadow-[0_4px_20px_rgba(37,99,235,0.1)] border-b border-blue-500/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" size={28} />
            <span className="font-bold text-xl text-white tracking-wide">CSPM Dashboard</span>
          </div>

          {/* Menu Dropdown */}
          <Menu as="div" className="relative inline-block text-left">
            <div>
              <Menu.Button className="flex items-center gap-2 bg-slate-950/50 hover:bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
                <div className="w-8 h-8 rounded-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)] text-white flex items-center justify-center font-bold">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-300 hidden sm:block">
                  {userName}
                </span>
                <ChevronDown size={16} className="text-slate-500" />
              </Menu.Button>
            </div>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-slate-700/50 rounded-xl bg-slate-800 border border-slate-700 shadow-xl shadow-black/50 focus:outline-none overflow-hidden">
                <div className="px-1 py-1 ">
                  <Menu.Item>
                    {({ active }) => (
                      <button className={`${active ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300'} group flex w-full items-center rounded-lg px-2 py-2 text-sm transition-colors`}>
                        <User className="mr-2 h-5 w-5" />
                        Hồ sơ của tôi
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button className={`${active ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300'} group flex w-full items-center rounded-lg px-2 py-2 text-sm transition-colors`}>
                        <Settings className="mr-2 h-5 w-5" />
                        Cài đặt hệ thống
                      </button>
                    )}
                  </Menu.Item>
                </div>
                <div className="px-1 py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button 
                        onClick={handleLogout}
                        className={`${active ? 'bg-red-500/20 text-red-400' : 'text-red-500'} group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors`}
                      >
                        <LogOut className="mr-2 h-5 w-5" />
                        Đăng xuất
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;