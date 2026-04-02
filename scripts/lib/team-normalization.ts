export type TeamNormalization = {
  sourceNamePt: string;
  code: string;
  nameEn: string;
  namePt: string;
  flagCode: string | null;
  federation: string | null;
  isPlaceholder: boolean;
  placeholderType: string | null;
};

export const teamNormalizations: TeamNormalization[] = [
  { sourceNamePt: "Alemanha", code: "GERMANY", nameEn: "Germany", namePt: "Alemanha", flagCode: "de", federation: "UEFA", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Argentina", code: "ARGENTINA", nameEn: "Argentina", namePt: "Argentina", flagCode: "ar", federation: "CONMEBOL", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Argélia", code: "ALGERIA", nameEn: "Algeria", namePt: "Argélia", flagCode: "dz", federation: "CAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Arábia Saudita", code: "SAUDI_ARABIA", nameEn: "Saudi Arabia", namePt: "Arábia Saudita", flagCode: "sa", federation: "AFC", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Austrália", code: "AUSTRALIA", nameEn: "Australia", namePt: "Austrália", flagCode: "au", federation: "AFC", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Brasil", code: "BRAZIL", nameEn: "Brazil", namePt: "Brasil", flagCode: "br", federation: "CONMEBOL", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Bélgica", code: "BELGIUM", nameEn: "Belgium", namePt: "Bélgica", flagCode: "be", federation: "UEFA", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Cabo Verde", code: "CAPE_VERDE", nameEn: "Cape Verde", namePt: "Cabo Verde", flagCode: "cv", federation: "CAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Canadá", code: "CANADA", nameEn: "Canada", namePt: "Canadá", flagCode: "ca", federation: "CONCACAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Catar", code: "QATAR", nameEn: "Qatar", namePt: "Catar", flagCode: "qa", federation: "AFC", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Colômbia", code: "COLOMBIA", nameEn: "Colombia", namePt: "Colômbia", flagCode: "co", federation: "CONMEBOL", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Coreia do Sul", code: "SOUTH_KOREA", nameEn: "South Korea", namePt: "Coreia do Sul", flagCode: "kr", federation: "AFC", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Costa do Marfim", code: "IVORY_COAST", nameEn: "Ivory Coast", namePt: "Costa do Marfim", flagCode: "ci", federation: "CAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Croácia", code: "CROATIA", nameEn: "Croatia", namePt: "Croácia", flagCode: "hr", federation: "UEFA", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Curaçao", code: "CURACAO", nameEn: "Curacao", namePt: "Curaçao", flagCode: "cw", federation: "CONCACAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Egito", code: "EGYPT", nameEn: "Egypt", namePt: "Egito", flagCode: "eg", federation: "CAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Equador", code: "ECUADOR", nameEn: "Ecuador", namePt: "Equador", flagCode: "ec", federation: "CONMEBOL", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Escócia", code: "SCOTLAND", nameEn: "Scotland", namePt: "Escócia", flagCode: "gb-sct", federation: "UEFA", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Espanha", code: "SPAIN", nameEn: "Spain", namePt: "Espanha", flagCode: "es", federation: "UEFA", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Estados Unidos", code: "UNITED_STATES", nameEn: "United States", namePt: "Estados Unidos", flagCode: "us", federation: "CONCACAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "França", code: "FRANCE", nameEn: "France", namePt: "França", flagCode: "fr", federation: "UEFA", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Gana", code: "GHANA", nameEn: "Ghana", namePt: "Gana", flagCode: "gh", federation: "CAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Haiti", code: "HAITI", nameEn: "Haiti", namePt: "Haiti", flagCode: "ht", federation: "CONCACAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Holanda", code: "NETHERLANDS", nameEn: "Netherlands", namePt: "Holanda", flagCode: "nl", federation: "UEFA", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Inglaterra", code: "ENGLAND", nameEn: "England", namePt: "Inglaterra", flagCode: "gb-eng", federation: "UEFA", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Irã", code: "IRAN", nameEn: "Iran", namePt: "Irã", flagCode: "ir", federation: "AFC", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Japão", code: "JAPAN", nameEn: "Japan", namePt: "Japão", flagCode: "jp", federation: "AFC", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Jordânia", code: "JORDAN", nameEn: "Jordan", namePt: "Jordânia", flagCode: "jo", federation: "AFC", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Marrocos", code: "MOROCCO", nameEn: "Morocco", namePt: "Marrocos", flagCode: "ma", federation: "CAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "México", code: "MEXICO", nameEn: "Mexico", namePt: "México", flagCode: "mx", federation: "CONCACAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Noruega", code: "NORWAY", nameEn: "Norway", namePt: "Noruega", flagCode: "no", federation: "UEFA", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Nova Zelândia", code: "NEW_ZEALAND", nameEn: "New Zealand", namePt: "Nova Zelândia", flagCode: "nz", federation: "OFC", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Panamá", code: "PANAMA", nameEn: "Panama", namePt: "Panamá", flagCode: "pa", federation: "CONCACAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Paraguai", code: "PARAGUAY", nameEn: "Paraguay", namePt: "Paraguai", flagCode: "py", federation: "CONMEBOL", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Bósnia", code: "BOSNIA_AND_HERZEGOVINA", nameEn: "Bosnia and Herzegovina", namePt: "Bósnia", flagCode: "ba", federation: "UEFA", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Iraque", code: "IRAQ", nameEn: "Iraq", namePt: "Iraque", flagCode: "iq", federation: "AFC", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "RD Congo", code: "DR_CONGO", nameEn: "DR Congo", namePt: "RD Congo", flagCode: "cd", federation: "CAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "República Tcheca", code: "CZECH_REPUBLIC", nameEn: "Czech Republic", namePt: "República Tcheca", flagCode: "cz", federation: "UEFA", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Portugal", code: "PORTUGAL", nameEn: "Portugal", namePt: "Portugal", flagCode: "pt", federation: "UEFA", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Senegal", code: "SENEGAL", nameEn: "Senegal", namePt: "Senegal", flagCode: "sn", federation: "CAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Suécia", code: "SWEDEN", nameEn: "Sweden", namePt: "Suécia", flagCode: "se", federation: "UEFA", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Suíça", code: "SWITZERLAND", nameEn: "Switzerland", namePt: "Suíça", flagCode: "ch", federation: "UEFA", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Turquia", code: "TURKEY", nameEn: "Turkey", namePt: "Turquia", flagCode: "tr", federation: "UEFA", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Tunísia", code: "TUNISIA", nameEn: "Tunisia", namePt: "Tunísia", flagCode: "tn", federation: "CAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Uruguai", code: "URUGUAY", nameEn: "Uruguay", namePt: "Uruguai", flagCode: "uy", federation: "CONMEBOL", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Uzbequistão", code: "UZBEKISTAN", nameEn: "Uzbekistan", namePt: "Uzbequistão", flagCode: "uz", federation: "AFC", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "África do Sul", code: "SOUTH_AFRICA", nameEn: "South Africa", namePt: "África do Sul", flagCode: "za", federation: "CAF", isPlaceholder: false, placeholderType: null },
  { sourceNamePt: "Áustria", code: "AUSTRIA", nameEn: "Austria", namePt: "Áustria", flagCode: "at", federation: "UEFA", isPlaceholder: false, placeholderType: null },
];

export const teamNormalizationBySourceName = new Map(
  teamNormalizations.map((team) => [team.sourceNamePt, team]),
);
