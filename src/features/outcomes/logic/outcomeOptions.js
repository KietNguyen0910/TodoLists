export function normalizeOptionGroups(options) {
  return options.map((option, index) => (
    typeof option === 'string'
      ? { title: '', items: [option], key: `ungrouped-${index}` }
      : { title: option.title || '', items: option.items || [], key: option.title || `group-${index}` }
  ));
}

export function filterOptionGroups(optionGroups, searchTerm) {
  const keyword = searchTerm.trim().toLowerCase();

  return optionGroups
    .map((group) => ({
      ...group,
      items: keyword
        ? group.items.filter((option) => option.toLowerCase().includes(keyword))
        : group.items,
    }))
    .filter((group) => group.items.length > 0);
}
