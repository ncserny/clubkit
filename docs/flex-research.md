# Flex, Vienna: research for a walkable 3D model

Flex, Augartenbrücke 1 / "Am Donaukanal, Abgang Augartenbrücke", 1010 Wien. Operated by Kunst und Kulturverein U.S.W. (Thomas "Tom" Eller).

Every fact is tagged **SOURCED** (with source number, see list at end) or **GUESSED** (with reasoning). Local coordinates below use a metric frame centred on the OSM centroid of the Flex polygon (48.217772, 16.370884): +x = east, +y = north, in metres. Computed with 1° lat = 110,574 m, 1° lon = 74,200 m at this latitude.

The single most useful primary sources are the club's own technical documents on flex.at/technik [2]: a dimensioned hall plan ("hallenplan.jpg"), a stage plot, a lighting top view, café stage/lighting plots, and four 2017 photos of the empty rooms. Most interior numbers below come from those.

---

## 1. Location and coordinates

| Item | Value | Status |
|---|---|---|
| OSM polygon "Flex" (way 133677620), centroid | 48.217772, 16.370884 | SOURCED [5] |
| OSM polygon extent | lat 48.217598 to 48.217947, lon 16.370600 to 16.371168 | SOURCED [5] |
| OSM tags | amenity=nightclub, building=retail, layer=-1, location=surface, building:levels=1, wheelchair=yes, opening_hours "Th-Sa 23:00-06:00" | SOURCED [5] |
| de.wikipedia coordinate | 48°13'4.79"N 16°22'13.70"E = 48.21800, 16.37081 (about 25 m NW of the OSM centroid) | SOURCED [7] |
| **Entrance (door)** | ≈ 48.21792, 16.37072 (local ≈ −12, +17), at quay (Vorkai) level, at the NW end of the street-front, facing NE toward the water | GUESSED: the OSM polygon has a small notch at its NW end (48.217947/16.370678 to 48.21791/16.370733) which looks like a door recess; the café is described as a pavilion "beside the entrance" [3][7][15], and arrivals come along the quay from the Augartenbrücke stairs to the NW. |
| **Venue centre (main hall centre)** | ≈ 48.21770, 16.37080 (local ≈ −6, −8) | GUESSED: hall lies directly behind (SW of) the quay retaining wall whose line forms the long SW edge of the OSM polygon; shifted ~6 m inland from the polygon centroid. |

**Which side of the bridge / bank**

- Flex is on the **right (south-west) bank** of the Donaukanal, the Innere Stadt (1st district) side, on the **lower quay ("Vorkai")** below Franz-Josefs-Kai. SOURCED [1][3][7][16].
- It is **downstream (south-east) of the Augartenbrücke**, between the bridge and Schottenring station. SOURCED [7] ("between U-Bahn station Schottenring and the Augartenbrücke"); geometry from OSM [5]. The canal flows NW→SE here.
- Distances from the Flex centroid (OSM [5], computed):
  - Augartenbrücke SW abutment / Maria-Theresien-Straße junction: ~112 m at bearing 305° (NW). The bridge deck crosses the quay roughly 80 to 100 m NW of the centroid.
  - Stairs from street level down to the Vorkai: two short flights just SE of the bridgehead, at ~50 m (bearing 333°) and ~60 m (bearing 331°) from the centroid (OSM ways 849098308 and 1539892191, both tagged steps/incline=down, paving stones). A further concrete stair (way 133677626) climbs at ~−51,+49 to −61,+60 near the bridge abutment.
  - Schottenring U4 station surface building (OSM building=train_station, height 6 m): ~73 m at 158° (SSE). The Franz-Josefs-Kai station entrance (wheelchair, level 0) is ~77 m at 163°.
  - Ringturm (73 m, 25 storeys): ~90 m at 209° (SW), across the Franz-Josefs-Kai.
  - Kaiserbad lock footbridge (Kaiserbadschleuse): ~72 m at 121° (SE).
- **Relation to the U4/U2**: OSM maps the U4 tracks (layer −1, "tunnel", in fact the covered *Galeriestrecke*) running along the same line as the quay retaining wall, the nearest mapped track point is ~10 m from the centroid at bearing 250° [5]. A U4 branch/link track (way 747328079) curves away westward under Schottenring toward the old U2 connection [5]. The U2 is far deeper (~23 m below the canal) and crosses under the canal at Schottenring [10]. SOURCED (positions are OSM-accurate, i.e. ±3 to 5 m).
- **Road above**: Franz-Josefs-Kai (B227, primary) runs along the top of the retaining wall, directly above/behind the hall. Upstream (NW of the bridge) the same embankment road is called Rossauer Lände. SOURCED [5].

## 2. Construction

**What it is**

- A "disused U-Bahn tunnel section of line U4 on the Donaukanal" (stillgelegter U-Bahn-Tunnelabschnitt der Linie U4). SOURCED [7]. Also described as a former U-Bahn shaft/"Schacht" given by mayor Helmut Zilk, converted by the crew themselves. SOURCED [11][12].
- The U4 here is the former Stadtbahn Donaukanallinie (Otto Wagner, opened 1901), built as a 5.8 km **"gallery" line**: tracks at roughly lower-quay level, roofed by the road above, and open (originally arcaded) on the canal side. SOURCED [13][14] (UrbanRail: "covered, though open on the side of the Danube Canal").
- Therefore the hall is best modelled as **a sealed-off bay of the canal-side gallery**: a long rectangular box, long axis parallel to the canal (bearing ≈130°/310°), floor at Vorkai level, flat concrete/steel ceiling slab under the road, canal-side wall = the quay retaining wall with doors in it, inland wall = partition toward the live U4 tracks. GUESSED from [5][7][13][14] plus the plan and photos [2].
- **Not vaulted.** The 2017 photos [2] show a **flat ceiling** with exposed steel beams, cable trays, ducts and pipes; no brick vaults. SOURCED (photos [2]).
- Flex Café is a separate **single-storey pavilion ("Vorbau")** built in front of the club in 2007, about **400 m²** (the area leased to Flex for the pavilion by DHK, the Donaukanal property company). SOURCED [7][15].
- Conversion cost ≈ 11 million Schilling (≈ €800,000), of which the city gave a one-off 3 million Schilling (≈ €220,000) start subsidy. SOURCED [7][15].

**Orientation**

- Long axis NW–SE (bearing ~130°), parallel to the canal. Retaining-wall segment along the polygon: 51.7 m long at bearing 129.9° (OSM [5], computed).
- **Stage at the SE end** (Schottenring end), entrance/bar zone toward the NW (bridge) end. GUESSED but well supported: in the hall plan [2] the wall carrying the "loading doors" opens straight onto the "nightliner parking lot" (i.e. the quay = NE side); with that wall at the bottom of the plan, the stage is drawn at the left, which in true orientation is SE. The 2017 photo looking toward the stage [2] shows the door-pierced wall on the viewer's left, which matches (facing SE, the canal is on the left).

**Dimensions**

| Element | Value | Status |
|---|---|---|
| Hall clear width (retaining wall to inland wall) | ≈ 10.5 to 11 m | GUESSED: scaled from the hall plan [2] (plan scale ≈ 96 px/m from its own 3.70 m and 5.76 m dimension lines; inner wall-to-wall ≈ 1,040 px). |
| Main dance strip width (inland side) | ≈ 5.8 m (matches stage width) | SOURCED stage width 5.71 to 5.96 m [2]; strip width inferred from plan. |
| Raised side platform (canal side) | ≈ 4.5 m wide, a few steps up, with columns and red handrails; the FOH sits at its stage-end corner | GUESSED from plan + photo [2]; old Wikipedia text says control is "elevated between the midsection and the stage front" [8]. |
| Stage-front to FOH | 7.86 m; FOH box 1.67 m wide | SOURCED (hall plan [2]) |
| Rear wall to stage front | 1.14 m + 3.70 m ≈ 4.84 m (stage zone depth) | SOURCED (hall plan [2]) |
| Hall length | ≈ 35 to 45 m | GUESSED: lighting top view [2] shows audience fixtures ~20 m out from the LED wall and more wall fixtures beyond; the OSM frontage is 52 m; fast-and-wide calls the main floor "long" [6]. |
| Ceiling height above dance floor | ≈ 4.3 to 4.8 m | GUESSED: stage deck 1.02 m + truss trims 2.33 to 2.78 m above stage/riser + truss and clearance [2]; photos show ducts close above the trusses. |
| Street (Franz-Josefs-Kai) above Vorkai | ≈ 6 to 7 m | GUESSED: EU-DEM 25 m gives ~166 m road vs ~159 m quay vs ~156 m water near the site [17]; coarse data. |
| Vorkai above normal water | ≈ 2 to 3 m | GUESSED: same DEM, plus the quay must clear normal water; a coach-height clearance of 4.20 m under the Rossauer Brücke "at the water" is SOURCED [3]. |
| Floor level of hall | same as the quay outside (step-free) | GUESSED: loading doors open directly to the quay in the plan [2]; OSM/Falter say wheelchair accessible [5][9]. |
| Café pavilion | ≈ 400 m²; low ceiling; ≈ 50 m long × 8 m deep strip along the wall in OSM | SOURCED area [15], "low ceiling ... porch beside the entrance" [6]; footprint from OSM [5]. |
| Café room proportions | stage 4 × 4 m; FOH (2 × 1 m) 8.5 m from stage front; plotted width ≈ 6.5 m, plotted length ≈ 20 m and continuing | SOURCED (café plots [2]); width/length scaled from the plot, GUESSED. |

**Materials (from photos [2])** SOURCED unless marked

- Hall walls: rough masonry/brick and concrete painted **matt black**, one long wall covered with a steel wire mesh; tags and stickers everywhere.
- Hall floor: smooth grey-beige poured concrete/screed, worn; steel chequer-plate ramp edges.
- Hall ceiling: dark, cluttered: steel beams, silver spiral ducts, pipes, cable bundles.
- Columns: square black-painted pillars with white chalk/paint tags ("Rauchen verboten", "VIP").
- Café: ceiling painted **dark red** with linear light strips, silver spiral ducts, black walls with tags, poured concrete floor.

## 3. Rooms and their order

Walk-through, NW to SE (GUESSED order, built from [2][3][5][7][15]):

1. **Arrival**: from Franz-Josefs-Kai / Augartenbrücke down the stairs at the bridgehead to the Vorkai ("Abgang Augartenbrücke") [3], then SE along the quay ~40 to 50 m.
2. **Outdoor garden / "Flex-Garten"** between the bridgehead and the café: ~500 m², tables and furniture partly under the Augartenbrücke bridgehead [15]; ~1,000 people per Falter [9]. OSM still maps a fence enclosing this zone (from local −50,+45 to +7,+5) [5]. In 2016 a 3 m board wall painted with abstract skulls closed it off, leaving a ~4 m path between wall and quay edge [15]; de.wikipedia says this fence was removed in spring 2025 [7]. Since 2007 used for public viewing on a big screen, benches in spring/summer [8][15]. Sound: 8 Alcons QR36 moved there from the main floor in 2022 [6]. SOURCED.
3. **Door / cashier / security**: at quay level beside the café pavilion. GUESSED position (see §1). Cloakroom: no source found; GUESSED just inside the door in the NW end of the hall, typical for the layout.
4. **Flex Café** (pavilion, 2007, free entry on many nights [9]): bar along one long side with red-topped stools, a sweeping **curved stepped concrete tier** (3 to 4 steps) outlined with red LED strips, red and black leather sofas on castors, small stage 4 × 4 m at the far end with an LED wall 384 × 256 cm, WC and emergency exit beside the café stage. SOURCED (photos and plots [2]). One guide calls it "upstairs" [18], unsupported elsewhere; treat as same level.
5. **Main hall ("Halle", the club)**: entrance/bar end at NW, dance floor, stage at SE. Bar: old Wikipedia mentions "the bar on the left hand side" [8] (left when facing the stage = canal side). GUESSED: bar at the NW end/canal side. FOH elevated mid-hall on the canal-side platform, 7.86 m from the stage front [2][8]. Merch table beside it [2].
6. **Stage**: 102 cm high deck, ≈ 5.6 to 5.7 m wide × 3.1 to 3.75 m deep, plus a 50 cm riser (5.71 × 1.73 m) at the back, optional risers 2.5 × 0.6 and 2.0 × 0.6 m; LED wall 5 × 3 m on the back wall. Stairs up to the stage on stage-left (canal side) from a backstage/green-room zone with a "monitoring + stagetech" room (1.30 × 1.40 m) and audio rack. SOURCED [2].
7. **Toilets**: hall plan shows a stair "to bathrooms" near the stage-end corner on the canal side [2]; café plot shows a WC by the café stage [2]. The toilets have an "iconic candy wall" (Zuckerlwand) [19]. SOURCED; whether the stair goes up or down is unclear from the plan.
8. **Backstage exit / loading**: two double loading doors in the canal-side wall of the hall and a door at the stage end opening to the nightliner parking spot on the quay (power: 1× 32 A 3-phase, 1× 16 A 3-phase, etc.) [2]. Coaches reverse down the bridge ramp, stop near the water under the Rossauer Brücke and drive forward along the canal, under the Augartenbrücke, to Flex [3]. SOURCED.

**Capacities**

- Whole venue "up to 1,000" / "roughly 1,000", nearly all standing [9][18][20]. SOURCED (secondary sources).
- Garden ~1,000 [9]. SOURCED.
- Hall alone vs café: no source. GUESSED: hall ≈ 700 to 800, café ≈ 250 to 300 (area ratio, 2 to 3 people/m²).
- Visitors per year ≈ 50,000 (current de.wikipedia, technoairlines) or 100,000 (older figure) [7][16].

## 4. Sound system

History

- Famous since the 1990s ("best sound in the city", long rated among Europe's best clubs by Spex) [1][8]. No source names the original 1995 builder. NOT FOUND.
- Pre-2010 description: 4 large subwoofers under the stage, 2 large hanging mains (~1.8 × 0.6 m), ~6 stage monitors, 10 to 12 fill speakers around the club (entrance, midsection, by the bar on the left) [8]. SOURCED (old, unreferenced Wikipedia).
- **Alcons Audio** systems planned and installed by Pro Performance (Austrian Alcons distributor) **since 2007**; the c. 2010s mains were 3 × Alcons QR36 per side, flush-stacked, plus **two custom concrete horns built into the stage crawl space**, each ~1.8 m long × 0.6 m wide, each with four 15" drivers [6][8]. SOURCED.
- **2022 upgrade** (Pro Performance, Wolfgang Sauter): new Alcons Q-series mains, BC543 cardioid subs, the QR36s moved outdoors to the garden [6]. SOURCED.

Current hall rig (TechGuide v25.11, stage plot) [2] SOURCED

- Mains: 2 columns, each (bottom→top) **QM24 + 2 × QR24/110 + 2 × QR24/80**, ≈ 3.3 m tall [6], standing at the two front corners of the stage, **488 cm apart**, the QM24 at deck level and the columns rising to ~2.95 m above the stage deck. Not flown: they stand on the stage edge/sub structure.
- Subs: **2 front-loaded concrete bass horns** under the stage, each 4 × Eighteensound 15ND930 (8 × 15" total), Lab Gruppen FP10000Q amps. In the photo they appear as two large flared black mouths under the stage lip, split by a centre post, with red "RAUCHVERBOT" LED tickers on them. Plus **Alcons BC543** cardioid triple-18" subs (2 per the TechGuide, 4 per the web page and 2022 press; "two stacked on each side") inside the stage base beside the horns.
- Amps: Alcons Sentinel 10 (3×); DSP Xilica Solaro FR1; FOH Allen & Heath dLive S5000.
- DJ monitors: 2 × L-Acoustics ARCS Wide + 2 × SB18m. Stage monitors: 8 × NEXO PS15-R2.
- Café: 6 × Alcons LR18 (3 per side) at stage front corners, 8 × Lambda Labs DW-15 subs in end-fire on both sides of the café stage, plus 7 bass traps tuned 20/25/35 Hz [2][6].
- Earplugs historically free; free sparkling water historically [8]. SOURCED (old).

## 5. Look and dressing

- **Walls**: black, heavily tagged; old-school graffiti and stickers around the stage; "VIP" and "Rauchen verboten" painted on columns [2]. SOURCED (photos).
- **Outside**: the canal walls here are a legal graffiti wall, the **"Flex Hall of Fame"** at Franz-Josefs-Kai 59, legal since 1994, part of the "Wienerwand" scheme since 2005, repainted almost daily [21]. SOURCED. Model the quay retaining wall and stair walls fully sprayed.
- **Lighting, hall** [2] SOURCED: grandMA2; 3 trusses over the stage (front at 2.42 m, mid 2.78 m, back 2.33 m above stage/riser); a **circular truss ring** over the stage front carrying moving heads (photo); 25 Cameo Movo Beam Z100 + 17 Q-Spot on stage; **audience matrix of 152 Cameo Q-Spot 40 RGBW in a 19 × 8 grid** on the ceiling over the dance floor, plus 12 moving beams along the side walls, Showtec Sunstrip bars, **Martin Atomic 3000 strobes** (1 on stage, 2 over the audience), BRITEQ Lightstrike bars, audience blinders, UV cannons, Antari hazer and a fog machine; **LED wall 5 × 3 m** (Resolume visuals). No laser and no mirror ball listed; a faceted sphere fixture hangs in the truss ring (photo, could read as a mirror-ball-like moving head). Old sources describe "visuals" [1].
- **Lighting, café** [2] SOURCED: red ceiling with long light strips, ADJ Mega Tri Bars and Sunstrips along both long walls, a few moving beams, LED wall 384 × 256 cm, red LED lines in the stepped seating.
- **Colours** GUESSED from photos: black walls, grey concrete floor, red accents (café ceiling, sofas, handrails, LED tickers), white/RGB beams, saturated red/blue wash during club nights.
- **FLEX lettering**: the club's wordmark is "FLEX" in **bold, heavily italic, condensed sans capitals, widely letter-spaced** (TechGuide cover [2]); the web logo file is white ("Flex-Logo-weiss") [2]. SOURCED for type style. Exterior placement and colour: GUESSED, white lettering on the dark pavilion/retaining wall above the door, lit at night.
- **Door**: most club nights 16+; some promoters run their own selection; drunk or aggressive people can be refused even with tickets [16]. Historical controversies about door policy (2006) [7]. SOURCED. **Queue**: GUESSED on the quay along the café frontage, between the bridge stairs and the door, crowd-controlled with barriers.

## 6. Surroundings within ~300 m

All SOURCED from OSM [5] unless noted; positions in local metres (x east, y north).

- **Donaukanal**: ~62 m wide between quay edges here (computed). Water flows NW→SE. Right-bank quay edge runs ~7 to 20 m in front of the retaining wall; the Vorkai widens toward the bridge.
- **Quay retaining wall** (OSM barrier=retaining_wall) runs NW–SE at bearing ~130°; height ≈ 6 to 7 m (GUESSED); this is the hall's canal-side wall.
- **Augartenbrücke**: steel road bridge by Hubert Gessner (1929 to 1931), destroyed April 1945, reopened 12 January 1946; four lanes, two tram tracks, two footpaths; NW end meets Maria-Theresien-Straße at the 1st/9th district boundary, NE end Untere Augartenstraße [22]. Renovated June 2024 to 1 July 2025 [23]. Deck crosses the canal ~80 to 170 m NW/N of Flex.
- **Schottenring station**: U4 rebuilt station reopened 3 April 1978 (central + side platforms) in the gallery; new U2 station under the canal opened 10 May 2008, ~23 m below the canal [10]. Surface pavilion ~73 m SSE; Herminengasse exit on the opposite bank ~180 m E; "Promenadenweg" exit at canal level on the Leopoldstadt side ~166 m E [5].
- **U4 gallery**: runs continuously along the right bank under/behind the roadway from Schwedenplatz to Friedensbrücke, covered, open toward the canal [14].
- **Ringturm** (73 m, Vienna Insurance Group) ~90 m SW [5]. **Rossauer Kaserne** (Ministry of Defence, Roßauer Lände 1) ~190 m NW beyond the bridgehead [5][22].
- **Kaiserbadschleuse** (Otto Wagner lock building and remains of a 50 m weir, 1904 to 1908) about 200 m downstream of the bridge; its footbridge is ~72 m SE of Flex; the Schützenhaus (now a restaurant, Obere Donaustraße 26) stands on the opposite bank ~130 m E [5][24].
- **Opposite bank** (Leopoldstadt): Obere Donaustraße (B227), Johannes-Nepomuk-Kapelle near the bridge's NE end, kiosk "Kaiserzeit" on the bridge, Bundesamt für Eich- und Vermessungswesen (8 floors), 5 to 9 storey apartment blocks [5].
- **Upstream (NW)**: Roßauer Brücke (1983) ~256 m NW; Olga-Misař-Promenade and Ruth-Maier-Park, a wooden "Sonnendeck" lounger (2024) on the right bank just upstream of the Augartenbrücke [5].
- **Trees**: the Schottenring/Franz-Josefs-Kai median and verges carry mature street trees 8 to 25 m tall [5]; GUESSED: a few trees and shrubs on the Vorkai slopes.
- **Other venues** (beyond 300 m): Summer Stage on the Rossauer Lände quay toward Friedensbrücke (~0.6 to 1 km NW), Motto am Fluss at Schwedenplatz (~0.9 km SE). GUESSED distances from general knowledge, not checked.

## 7. History in brief

- New Year's Eve 1989/90: opened in Arndtstraße, Meidling (12th district), run by people from the squat scene around Aegidigasse; punk/hardcore venue [7][16]. (Some sources say founded 1990 [1][11].)
- 1992 left Arndtstraße [11]; 1 October 1995 reopened in the disused U4 tunnel section on the Donaukanal, backed by mayor Zilk against opposition from the 1st district [7][11][16].
- Late 1990s to 2000s: Dub Club (Mondays, dub/jungle, from 1995), drum and bass (Beat It, The Hive neurofunk, Wicked ragga-jungle), indie (London Calling), minimal techno (Electronic Tuesday) [7][8]. Seen as home base of the "Vienna sound" (Kruder & Dorfmeister era) [11][1].
- 2005: quay path behind Flex closed for U-Bahn works (the U2 extension) [7].
- 2007: Flex Café pavilion opened; garden used for public viewing; Alcons system installed [6][7][15].
- July 2011: closing time extended from 04:00 to 06:00 [7].
- Dec 2014: insolvency proceedings, ~€550,000 debts, survived [18][25].
- 2016: 3 m skull-painted board fence around the ~500 m² garden [15]; removed spring 2025 [7].
- 2022: Alcons sound upgrade [6].
- Now: club nights mostly **Thursday to Saturday 23:00 to 06:00**, concerts usually from 19:00 [1][16]. Peak crowd GUESSED ~01:00 to 03:00 (typical Vienna club pattern).

## 8. Suggested viewpoints

1. **Augartenbrücke deck, SE railing** (≈ −60, +95, height ~+8 m above quay): looking downstream onto the Flex garden, café roof and the Ringturm.
2. **Top of the bridgehead stairs** (≈ −30, +55, street level): the descent to the Vorkai, graffiti walls.
3. **Quay at the door** (≈ −8, +22, eye 1.7 m, looking SW): queue, door, FLEX lettering, café frontage.
4. **Inside the café on the curved concrete steps** looking toward the café stage.
5. **Hall, rear/bar end** (NW end, looking SE down the long hall): the photo view in [2].
6. **Dance floor centre, ~4 m from the stage front**: between the PA columns, sub-horn mouths and LED wall; strobe matrix overhead.
7. **FOH on the raised side platform**: elevated view of the floor.
8. **On stage / DJ position** looking back NW at the crowd.
9. **Quay edge opposite the Flex** (≈ +5, +10, at the water): the canal, the retaining wall and the U4 gallery line, Kaiserbad lock to the SE.
10. **Opposite bank, Leopoldstadt towpath** (≈ +30, +60): full elevation of the Flex frontage across the water, with the Ringturm behind.

---

## Biggest uncertainties

- Exact hall length and the position of the hall relative to the café pavilion (side by side along the wall vs café in front of part of the hall).
- Exact door position and cloakroom location.
- Whether the toilets are up or down a stair.
- Real heights (road, quay, water) to within ±1 m; only a coarse DEM was available.
- Exterior FLEX sign placement and colour.

## Sources

1. wien.info, "Flex": https://www.wien.info/en/dine-drink/bars-clubs/clubs-discos/flex-346078 and "Electronic sounds": https://www.wien.info/de/essen-trinken/bars-clubs/elektronische-sounds-345080
2. flex.at Technik page and linked documents: https://flex.at/technik/ ; hall plan https://flex.at/wp-content/uploads/2022/12/hallenplan.jpg ; photos https://flex.at/wp-content/uploads/2022/12/2017-01-30-13.09.28.jpg (café stage), -13.10.35.jpg (hall stage), -16.51.52.jpg (hall from rear), -16.52.20.jpg (café) ; TechGuide https://flex.at/wp-content/uploads/2026/09/FLEX_TechGuide_v25_11-1.pdf ; stage plot https://flex.at/wp-content/uploads/2026/09/flex_halle_stageplot_v25_11-1.pdf ; hall lighting top view https://flex.at/wp-content/uploads/2026/09/FLEX_Halle_LightingPlot_TopView_v2608.pdf ; café stage plot https://flex.at/wp-content/uploads/2026/09/FLEX_Cafe_StagePlot_v2502-1-1.pdf ; café lighting plot https://flex.at/wp-content/uploads/2026/09/FLEX_Cafe_Lighting_Plot_v2502-1.pdf
3. flex.at Kontakt (address, coach directions, 4.20 m clearance): https://flex.at/kontakt/
4. flex.at home: https://flex.at/
5. OpenStreetMap via Nominatim and Overpass API (ways 133677620 Flex, 133677642 retaining wall, 245336757/747328076/747328079 U4, 27813924/27813937 Augartenbrücke, 1539892189 quay, 1082263294 fence, steps 849098308/1539892191/133677626, 183061605 station, 160760218 Ringturm, 313734160 lock): https://www.openstreetmap.org/way/133677620
6. Fast and Wide (Alcons news), "Vienna's Flex" 2022: https://www.fast-and-wide.com/faw-news/fast-news/17647-vienna-s-flex
7. de.wikipedia "Flex (Club)" (wikitext read via action=raw): https://de.wikipedia.org/wiki/Flex_(Club) ; mirror https://austria-forum.org/af/AustriaWiki/Flex_(Club)
8. en.wikipedia "Flex (club)", current and revisions 402184691 (2010) and 1240455308 (2024): https://en.wikipedia.org/wiki/Flex_(club)
9. Falter Lokalführer "Flex": https://www.falter.at/lokal/4812/flex
10. de.wikipedia "U-Bahn-Station Schottenring": https://de.wikipedia.org/wiki/U-Bahn-Station_Schottenring
11. Vice, "Verraucht und versifft ..." (Vienna 1990s club history): https://www.vice.com/de/article/verraucht-und-versifft-wie-aus-dem-raudigen-wien-in-den-90ern-eine-rave-und-downbeat-metropole-wurde/
12. profil, "Warum Wien ... Kult-Location Flex" (search snippet only, page 403): https://www.profil.at/kultur/warum-wien-kult-location-flex-378184
13. Heidelberg arthistoricum publication on the Stadtbahn (Galerielinie 5.8 km, search snippet): https://books.ub.uni-heidelberg.de/arthistoricum/catalog/view/1434/2487/117401
14. UrbanRail.net Vienna: https://urbanrail.net/eu/at/vienna/wien.htm
15. Wiener Zeitung, "Das Flex macht sich breit" (1 Oct 2016): https://www.tagblatt-wienerzeitung.at/nachrichten/wien/stadtpolitik/847931_Das-Flex-macht-sich-breit.html
16. Techno Airlines, "Flex Vienna": https://www.technoairlines.com/club/flex-vienna
17. OpenTopoData EU-DEM 25 m and Open-Elevation point queries (coarse terrain heights): https://api.opentopodata.org/v1/eudem25m
18. Search snippets: tablejourney (https://tablejourney.com/austria/vienna/nightlife/flex/), ticketfairy (https://ticketfairy.com/events-in-vienna/flex)
19. goodnight.at "Flex": https://goodnight.at/locations/56-flex
20. eventstoday.de location page: https://eventstoday.de/locations/700693845742
21. Angewandte base, "Ludic Space: Graffiti in Vienna / Flex Hall of Fame": https://base.uni-ak.ac.at/showroom/KwHn2VDCP2PFBsBEzTGGKD
22. en.wikipedia "Augartenbrücke": https://en.wikipedia.org/wiki/Augartenbr%C3%BCcke
23. Wien Geschichte Wiki "Brücken" (search snippet on 2024/25 renovation): https://www.geschichtewiki.wien.gv.at/Br%C3%BCcken
24. Wien Geschichte Wiki "Kaiserbadschleuse": https://www.geschichtewiki.wien.gv.at/Kaiserbadschleuse
25. Falter, "Flex oder ex?" (9 Dec 2014, teaser): https://www.falter.at/zeitung/20141209/flex-oder-ex
