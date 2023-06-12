import  NavbarItem  from './NavbarItem';

const navigation = [
  { name: 'Upload', href: '/' },
  { name: 'View', href: '/view' },
];

const Navbar = () => {
  return (
    <header className="bg-white">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
        aria-label="Global"
      >
        <div className="flex lg:flex-1">
          <a href="/" className="-m-1.5 p-1.5">
            <span className="sr-only">Your Company</span>
            <img
              className="h-8 w-auto"
              src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
              alt=""
            />
          </a>
        </div>
        <div className="hidden lg:flex lg:gap-x-12">
          {navigation.map((item) => 
              <NavbarItem refh={item.href} name={item.name}/>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
