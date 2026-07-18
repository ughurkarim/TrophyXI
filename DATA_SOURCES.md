# Trophy XI data sources

## Method

Player ratings and seven attributes are original game estimates designed for
relative simulation balance. They are not sourced facts, career rankings, or
official FIFA/EA ratings.

Tournament statistics are nullable. A known value requires at least one
card-level `DataCitation`; an unknown value stays `null` and is rendered as “Not
sourced.” Named achievements require their own citation. The Zod schema and
`npm run validate:data` reject a populated stat line without a source.

Current evidence coverage:

- 5 cards with at least one sourced tournament statistic
- 9 cards with a sourced named tournament achievement
- all other stat fields remain explicitly unknown

## Published sources

### FIFA — Russia 2018 awards

https://inside.fifa.com/en/tournaments/mens/worldcup/2018russia/news/157-awards-piece-2986294

Used for the 2018 Golden Ball, Golden Glove, Young Player Award, Bronze Ball, and
Golden Boot; also supports the published goal/assist or clean-sheet statements
included on those award cards.

### FIFA — Russia 2018 player statistics

https://inside.fifa.com/en/tournaments/mens/worldcup/2018russia/news/will-world-cup-stars-shine-at-the-best

Used for Luka Modrić’s seven appearances, 694 minutes, two goals, and one assist;
Thibaut Courtois’s three clean sheets; and the published 2018 goal totals surfaced
on selected cards.

### FIFA Publications — Qatar 2022 summary

https://publications.fifa.com/en/annual-report-2022/2022-at-a-glance/fifa-world-cup-qatar-2022-summary/

Used for the 2022 Golden Ball, Golden Boot, Golden Glove, and Young Player Award.

Sources were accessed on 2026-07-18. Future additions must prefer official
tournament bodies or equally trustworthy published databases, cite the exact page,
and distinguish stat evidence from Trophy XI balance estimates.
