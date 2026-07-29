export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export const formatYear = (year: number) => String(year);


const lowercaseNameParticles = new Set([
  "al",
  "da",
  "das",
  "de",
  "del",
  "della",
  "der",
  "di",
  "dos",
  "du",
  "el",
  "la",
  "le",
  "van",
  "von",
]);

const preservedNameSuffixes = new Set(["II", "III", "IV", "V", "VI"]);

const hasOnlyUppercaseLetters = (value: string) => {
  const letters = value.match(/\p{L}/gu)?.join("") ?? "";
  return (
    letters.length > 1 &&
    letters === letters.toLocaleUpperCase("en-US") &&
    letters !== letters.toLocaleLowerCase("en-US")
  );
};

const naturalizeUppercaseNamePart = (value: string) => {
  if (!hasOnlyUppercaseLetters(value) || preservedNameSuffixes.has(value)) {
    return value;
  }

  const lower = value.toLocaleLowerCase("en-US");
  const natural = `${lower.charAt(0).toLocaleUpperCase("en-US")}${lower.slice(1)}`;

  if (/^Mc\p{L}/u.test(natural)) {
    return `${natural.slice(0, 2)}${natural
      .charAt(2)
      .toLocaleUpperCase("en-US")}${natural.slice(3)}`;
  }

  return natural;
};

/**
 * Normalizes display-only player-name casing without changing stored archive data.
 * Correctly cased tokens are preserved; only fully uppercase name parts are adjusted.
 */
export const formatPlayerDisplayName = (value: string) =>
  value
    .split(/(\s+)/u)
    .map((token, index) => {
      if (!token.trim()) return token;

      const lowercaseToken = token.toLocaleLowerCase("en-US");
      if (
        index > 0 &&
        lowercaseNameParticles.has(lowercaseToken) &&
        hasOnlyUppercaseLetters(token)
      ) {
        return lowercaseToken;
      }

      return token
        .split(/([-'’])/u)
        .map((part) => naturalizeUppercaseNamePart(part))
        .join("");
    })
    .join("");


export const flagForCountry = (countryCode: string) => {
  const flags: Record<string, string> = {
    AGO: "🇦🇴",
    ARE: "🇦🇪",
    ARG: "🇦🇷",
    ALG: "🇩🇿",
    AUT: "🇦🇹",
    AUS: "🇦🇺",
    BEL: "🇧🇪",
    BGR: "🇧🇬",
    BIH: "🇧🇦",
    BOL: "🇧🇴",
    BRA: "🇧🇷",
    CAN: "🇨🇦",
    CHE: "🇨🇭",
    CHI: "🇨🇱",
    CHL: "🇨🇱",
    CHN: "🇨🇳",
    CIV: "🇨🇮",
    CMR: "🇨🇲",
    COL: "🇨🇴",
    CRC: "🇨🇷",
    CRI: "🇨🇷",
    CRO: "🇭🇷",
    HRV: "🇭🇷",
    CPV: "🇨🇻",
    CUW: "🇨🇼",
    CZE: "🇨🇿",
    COD: "🇨🇩",
    DZA: "🇩🇿",
    DEN: "🇩🇰",
    DNK: "🇩🇰",
    ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    ECU: "🇪🇨",
    EGY: "🇪🇬",
    ESP: "🇪🇸",
    FRA: "🇫🇷",
    GER: "🇩🇪",
    DEU: "🇩🇪",
    GHA: "🇬🇭",
    GRC: "🇬🇷",
    HAI: "🇭🇹",
    HTI: "🇭🇹",
    HND: "🇭🇳",
    HUN: "🇭🇺",
    IRL: "🇮🇪",
    IRQ: "🇮🇶",
    ISL: "🇮🇸",
    ISR: "🇮🇱",
    ITA: "🇮🇹",
    IRN: "🇮🇷",
    JPN: "🇯🇵",
    JAM: "🇯🇲",
    JOR: "🇯🇴",
    KOR: "🇰🇷",
    PRK: "🇰🇵",
    KWT: "🇰🇼",
    MAR: "🇲🇦",
    MEX: "🇲🇽",
    NED: "🇳🇱",
    NLD: "🇳🇱",
    NGA: "🇳🇬",
    NOR: "🇳🇴",
    NZL: "🇳🇿",
    PAN: "🇵🇦",
    PAR: "🇵🇾",
    POR: "🇵🇹",
    PRT: "🇵🇹",
    PER: "🇵🇪",
    PRY: "🇵🇾",
    POL: "🇵🇱",
    ROU: "🇷🇴",
    RSA: "🇿🇦",
    ZAF: "🇿🇦",
    RUS: "🇷🇺",
    KSA: "🇸🇦",
    SAU: "🇸🇦",
    SEN: "🇸🇳",
    SRB: "🇷🇸",
    SUI: "🇨🇭",
    SVK: "🇸🇰",
    SVN: "🇸🇮",
    SWE: "🇸🇪",
    TUN: "🇹🇳",
    TGO: "🇹🇬",
    TTO: "🇹🇹",
    TUR: "🇹🇷",
    UKR: "🇺🇦",
    USA: "🇺🇸",
    URU: "🇺🇾",
    URY: "🇺🇾",
    UZB: "🇺🇿",
    QAT: "🇶🇦",
    SLV: "🇸🇻",
    SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    WAL: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
    CSK: "◇",
    DDR: "◇",
    NIR: "◇",
    SCG: "◇",
    SUN: "◇",
    YUG: "◇",
    TXI: "✦",
    ALL: "✦",
  };
  return flags[countryCode] ?? "◌";
};

export const flagForTeamName = (countryName: string) => {
  const codes: Record<string, string> = {
    Argentina: "ARG",
    Brazil: "BRA",
    Croatia: "CRO",
    France: "FRA",
    Germany: "GER",
    Italy: "ITA",
    Morocco: "MAR",
    Netherlands: "NED",
    Portugal: "POR",
    "Saudi Arabia": "KSA",
    Senegal: "SEN",
    "South Korea": "KOR",
    Spain: "ESP",
    Uruguay: "URU",
  };
  return flagForCountry(codes[countryName] ?? "");
};