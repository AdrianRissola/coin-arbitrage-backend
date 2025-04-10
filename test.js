const getMenu = (menuTitles, subMenu) =>
	subMenu
		? [
				{
					menuTitles,
					subMenu,
				},
		  ]
		: { menuTitles, subMenu: null };

const menu = getMenu('users', { menuTitle: ['subUsers', 'players', 'customers'] });

console.log(menu);
