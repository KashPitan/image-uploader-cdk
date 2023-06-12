const NavbarItem = ({refh, name}) => {
  return (
    <a
      href={refh}
      className="text-sm font-semibold leading-6 text-gray-900"
    >
      {name}
    </a>
  )
}

export default NavbarItem;