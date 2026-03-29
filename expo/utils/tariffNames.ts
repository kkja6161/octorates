export function shortenTariffName(fullName: string, maxLength: number = 20): string {
  if (fullName.length <= maxLength) {
    return fullName;
  }

  const abbreviations: Record<string, string> = {
    'Octopus': 'Oct',
    'November': 'Nov',
    'December': 'Dec',
    'January': 'Jan',
    'February': 'Feb',
    'March': 'Mar',
    'April': 'Apr',
    'August': 'Aug',
    'September': 'Sept',
    'October': 'Oct',
    'Business': 'Biz',
    'Intelligent': 'Intel',
    'Variable': 'Var',
    'Flexible': 'Flex',
  };

  let shortened = fullName;
  
  for (const [full, abbr] of Object.entries(abbreviations)) {
    shortened = shortened.replace(new RegExp(full, 'g'), abbr);
  }

  if (shortened.length <= maxLength) {
    return shortened;
  }

  return shortened.substring(0, maxLength - 1) + '…';
}

export function getTariffDisplayName(fullName: string, context: 'label' | 'comparison' | 'list' | 'short' = 'label'): string {
  switch (context) {
    case 'label':
      return shortenTariffName(fullName, 18);
    case 'comparison':
      return shortenTariffName(fullName, 22);
    case 'short':
      return shortenTariffName(fullName, 15);
    case 'list':
      return fullName;
    default:
      return fullName;
  }
}
