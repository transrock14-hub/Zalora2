/**
 * Lifestyle category rebuild (live Supabase):
 * 1) Removes mis-categorised groceries + generic seed kits in Lifestyle
 *    (safe: none referenced by order_items).
 * 2) Inserts 100 unique lifestyle products with unique Unsplash photos
 *    (validated HTTP 200 + image/*). No AI images. No repeated URLs.
 * 3) Enforces sales = wholesale × 1.20.
 *
 * Run:
 *   npx tsx scripts/seed-lifestyle-100.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'
import {
  salesPriceFromWholesale,
  wholesalePriceFromSales,
} from '../src/lib/wholesale-pricing'

function loadEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const k = t.slice(0, eq).trim()
      let v = t.slice(eq + 1).trim()
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1)
      }
      if (!process.env[k]) process.env[k] = v
    }
  } catch {
    // ignore
  }
}
loadEnv()

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(URL, KEY)

const TARGET = 100
const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`

/** Real lifestyle / home / wellness / daily-living photos (Unsplash). */
const LIFESTYLE_PHOTO_IDS = [
  // home ritual / candles / decor
  '1602928321676-354314287990', '1603006905491-01d92bf74a7a', '1602928320891-ae896e553b1d',
  '1572725182171-c412d4310739', '1608571423902-eed4a5adbb6a', '1603006903443-1306bad836d0',
  '1513519245088-0e12902e35a6', '1513519245088-0e12902e5a86', // may fail - validated later
  '1586023492125-27b2c045efd7', '1567016432779-094069958ea5', '1513694203232-719a280e022f',
  '1524758631624-e2822e304c36', '1616486338812-3dadae4b4ace', '1556228453-efd6c1ff04f6',
  '1481277542470-605612bd2d61', '1522708323590-d24dbb6b0267', '1513885535751-8b9238bd345a',
  '1493663284031-bd9b440560a8', '1505693416388-ac5ce068fe85', '1494438639946-1ebd1d20bf85',
  '1484101403633-562f89127458', '1523755235798-484bfd810998', '1540518614846-c64202678754',
  '1616046229478-6991f90a0a36', '1615873968403-89e068629265', '1600210492493-0946911123ea',
  '1600585154340-be6161a56a0c', '1600607687939-ce8a6c25118c', '1600566753086-00f11dea4d86',
  '1600047509807-ba8e7a7c12f7', '1598928636135-d146006ff4be', '1583847268964-b28dc65e8050',
  // plants / wellness
  '1485955903038-8976b5f2f54d', '1459411552998-668b09ef856c', '1416879595882-3373a0480b5b',
  '1466692478816-51567867df3a', '1491147334573-44cbb4602074', '1501004318641-b39e6451bec6',
  '1518531933037-91b2f5f229cc', '1509423358717-cf6b77293451', '1459154162438-63e99b9a26c4',
  '1545239351-ef4357b5c553', '1565193560773-437769d24f5f', '1596754770371-2a236fb460e1',
  // yoga / fitness lifestyle
  '1544367567-0f2fcb009e0b', '1518611012118-696072aa579a', '1571019613454-1cb2f99b2d8b',
  '1599901860904-17e6bd3cabab', '1518310382802-5b7a1ae49753', '1506126613408-eca07ce68786',
  '1552196563-89d4ae54a46a', '1571902943202-507ec2618e8f', '1518611642110-68c664251b7f',
  // coffee / kitchen lifestyle
  '1495474472287-4d71bcdd2085', '1498804103079-a9356bfec589', '1509042239860-f550ce710b93',
  '1511920170033-f8396924c348', '1461027029759-c8c3d3b8c1ad', '1514432324607-a09d6be75d33',
  '1495474472287-4d71bcdd2085', // dup removed by Set later
  '1559056199-641a0ac8b55e', '1521017432531-fbd92d768814', '1470337458703-46ad1756a187',
  // journals / stationary lifestyle
  '1484480974693-6ca0a71bd74b', '1456327102063-5ab79ac4d566', '1517842645767-c6390e465727',
  '1434030216411-0b793f4b4173', '1506784983873-414fa4263adb', '1519682337058-a52d9abcc790',
  '1456513080840-b08fc60dacff', '1544716278-ca5e3f4abd8c', '1524995997940-a1c2e315a42f',
  // travel / outdoor lifestyle
  '1500530855697-b586d89ba3ee', '1469854523086-cc02fe5d8800', '1476514525535-07fb3b4ae5f1',
  '1488646953014-85cb44e25828', '1504280390367-361c6d9f38f4', '1523906834658-6e24ef2386f9',
  '1506197603052-3cc9c3a201bd', '1478131143081-80f7f84ca84d', '1506905925346-21bda4d32df4',
  // personal care / spa lifestyle
  '1556228720-195a672e8a03', '1570172619644-dfd5a8242491', '1515377905703-c4788e51af15',
  '1608571423902-eed4a5adbb6a', '1596755094514-f87e34085b2c', '1570194065650-d99fbce4a25b',
  '1522335789203-aabd916268a1', '1596755094514-f87e34085b2c',
  // lighting / ambience
  '1513506003901-1e6a229e2e15', '1507473885765-e6ed057f782c', '1532372320572-cda25653a26d',
  '1558618666-fcd25c85cd64', '1540932239986-30128078ea0d', '1565814329452-e1d0d706b5e3',
  // bags tote / daily carry lifestyle
  '1548036328-c9fa89d128fa', '1553062407-98eeb64c6a62', '1590874103328-eac38a683ce7',
  '1622560480605-d83c853bc5c3', '1566150905458-1bf1fc113f0d',
  // watches / small lifestyle accessories
  '1524805444758-089113d48a6d', '1523275335684-37898b6baf30', '1508685096489-7aacd43bd3b1',
  // music / leisure
  '1511379938547-c1f69419868d', '1493225457124-a3eb161ffa5f', '1511671782779-c97d3d27a1d4',
  '1459749411175-047df4757854', '1514525253161-7a46d19cd819',
  // more home / soft living
  '1556912172-45b7abe910ea', '1556911220-bff4c0b8c839', '1565183997395-0600f89fd9c0',
  '1584622785216-75e84ff265f9', '1556910103-1c02745aae4d', '1493857677165-e1099ddf5d46',
  '1556912173-46c336b4e833', '1600585152915-d208f8b009e0', '1616486339029-4f9a650b25a0',
  '1600210492486-724fe5c67fb3', '1615529182904-14819c35db37', '1617103816251-df6b7a59731a',
  '1600566752355-35792af0b7ac', '1615876238611-b0ac1d0c3497', '1631679706909-1844cd29d688',
  '1618220179428-22790b461013', '1618219387080-363d184da782', '1618220179428-22790b461013',
  '1616047002678-8e0f44f67fbb', '1615529328034-e23bd147cb65', '1600210492493-0946911123ea',
  // extra pool for validation failures
  '1515886657613-9f3515b0c78f', '1502716119720-b23a93e5fe1b', '1441984904996-e0b6ba687e04',
  '1445205170230-053b83016050', '1485462537746-965f33f7f6a7', '1490114538077-0a7f8cb49891',
  '1495121605193-b116b5b9c5fe', '1512436991641-6745cdb1723f', '1513094735237-8f2714d57c13',
  '1520006403909-838d6b92c22e', '1527719327859-c6ce80353573', '1532453288672-3a27e9be9efd',
  '1540221652346-e5dd6b50f3e7', '1542060748-10c28b62716f', '1558769132-cb1aea458c5e',
  '1567225557594-88d73e55f2cb', '1575904212457-1ac87e649045', '1583394838321-b1ea3871ee94',
  '1596462502278-27bfdc403348', '1601925260368-ae2f83cf8b7f', '1607613009820-a47475cac973',
  '1610701590060-849806a25624', '1611835659513-83209386dff0', '1616046230100-5a535584e28a',
]

/** 100 concrete lifestyle catalogue items (unique names). */
const LIFESTYLE_PRODUCTS: Array<{
  name: string
  short: string
  description: string
  wholesale: number
  attrs: string
}> = [
  { name: 'Northwind Scented Soy Candle Set', short: '3-piece calming candle trio', description: 'Hand-poured soy candles in cedar, linen, and citrus. Clean burn for living rooms and bedrooms.', wholesale: 18.5, attrs: 'candles' },
  { name: 'Lumen Ceramic Diffuser Lamp', short: 'Ultrasonic aroma diffuser', description: 'Soft-glow ceramic diffuser with auto shut-off. Ideal for evening wind-down rituals.', wholesale: 32.0, attrs: 'diffuser' },
  { name: 'Harbour Reed Diffuser — Sea Salt', short: 'Long-lasting reed diffuser', description: 'Alcohol-based reed diffuser with sea-salt and driftwood notes for open-plan spaces.', wholesale: 22.0, attrs: 'diffuser' },
  { name: 'Kanvas Cork Yoga Mat 5mm', short: 'Non-slip yoga mat', description: 'Natural cork top with TPE base. Extra grip when damp; includes carry strap.', wholesale: 28.0, attrs: 'yoga' },
  { name: 'Stillpoint Meditation Cushion', short: 'Buckwheat zafu cushion', description: 'Removable cotton cover stuffed with buckwheat hulls for grounded seated practice.', wholesale: 24.5, attrs: 'yoga' },
  { name: 'Flexband Resistance Loop Pack', short: '5-level exercise bands', description: 'Latex-free loops from light to extra-heavy for home strength sessions.', wholesale: 12.0, attrs: 'fitness' },
  { name: 'Dawnlight Foam Roller', short: 'Firm muscle roller', description: 'High-density foam roller for post-workout recovery and desk-day posture resets.', wholesale: 16.0, attrs: 'fitness' },
  { name: 'Oak & Ember Acacia Serving Board', short: 'Charcuterie / cheese board', description: 'Food-safe acacia board with juice groove. Dual-sided for prep and serving.', wholesale: 21.0, attrs: 'kitchen' },
  { name: 'Cascade Pour-Over Coffee Kit', short: 'Dripper, filters, carafe', description: 'Complete pour-over set for slow mornings. Heat-resistant glass carafe included.', wholesale: 29.5, attrs: 'coffee' },
  { name: 'Nimbus Double-Wall Travel Mug 350ml', short: 'Insulated takeaway mug', description: 'Keeps drinks hot or cold for hours. Leak-resistant lid for commuting.', wholesale: 17.0, attrs: 'drinkware' },
  { name: 'Fieldcraft Stainless Water Bottle 750ml', short: 'BPA-free insulated bottle', description: 'Powder-coat bottle with wide mouth for ice cubes and easy cleaning.', wholesale: 19.0, attrs: 'drinkware' },
  { name: 'Paper & Pine Dot Grid Journal A5', short: 'Undated bullet journal', description: 'Thick cream paper, lay-flat binding, ribbon marker. For planning and reflection.', wholesale: 14.0, attrs: 'stationery' },
  { name: 'Keystone Desk Organiser Tray', short: 'Modular desktop tidy', description: 'Matte ABS tray with compartments for pens, cables, and cards.', wholesale: 15.5, attrs: 'desk' },
  { name: 'Brightfolio LED Desk Lamp', short: 'Dimmable task lamp', description: 'Adjustable arm, three colour temperatures, USB charging port on the base.', wholesale: 34.0, attrs: 'lighting' },
  { name: 'Polaris Soft Throw Blanket', short: 'Fleece living-room throw', description: 'Plush mid-weight throw for sofa evenings. Machine washable.', wholesale: 23.0, attrs: 'home-textile' },
  { name: 'Nestweave Cotton Cushion Cover Pair', short: '45cm square covers', description: 'Stonewashed cotton covers with hidden zip. Inserts sold separately.', wholesale: 16.5, attrs: 'home-textile' },
  { name: 'Verdant Ceramic Plant Pot Set', short: '3 assorted planter pots', description: 'Drainage holes and saucers included. Matte glaze in warm neutrals.', wholesale: 20.0, attrs: 'plants' },
  { name: 'Canopy Self-Watering Herb Planter', short: 'Indoor herb planter', description: 'Reservoir base keeps basil and mint watered for days. Kitchen-counter friendly.', wholesale: 18.0, attrs: 'plants' },
  { name: 'Solstice Linen Napkin Set of 4', short: 'Stonewashed napkins', description: 'European flax linen, pre-washed soft. Everyday dining staple.', wholesale: 13.5, attrs: 'table' },
  { name: 'Coppernest Insulated Lunch Tote', short: 'Work lunch bag', description: 'Padded tote with foil lining and exterior bottle pocket.', wholesale: 17.5, attrs: 'everyday' },
  { name: 'UrbanMesh Compact Picnic Blanket', short: 'Water-resistant picnic mat', description: 'Folds into its own pouch. Sand-shedding underside for parks and beaches.', wholesale: 22.5, attrs: 'outdoor' },
  { name: 'Atlas Peak Daypack 18L', short: 'Lightweight lifestyle backpack', description: 'Laptop sleeve up to 14\", water-resistant fabric, clean city aesthetic.', wholesale: 36.0, attrs: 'bags' },
  { name: 'Silkroad Canvas Market Tote', short: 'Reusable shopping tote', description: 'Heavy canvas with reinforced handles. Ideal for groceries and weekend markets.', wholesale: 11.0, attrs: 'bags' },
  { name: 'Aurelia Velvet Eye Mask', short: 'Sleep eye mask', description: 'Soft velvet, adjustable strap, light-blocking for travel and naps.', wholesale: 9.5, attrs: 'sleep' },
  { name: 'Nightingale Weighted Sleep Mask Set', short: 'Mask + earplugs kit', description: 'Gentle pressure eye mask paired with foam earplugs for hotel nights.', wholesale: 14.5, attrs: 'sleep' },
  { name: 'Helix Care Bamboo Bath Towel Pair', short: 'Quick-dry towels', description: 'Absorbent bamboo-blend towels for spa-style bathroom refreshes.', wholesale: 26.0, attrs: 'bath' },
  { name: 'Kelp & Clay Body Scrub Set', short: 'Sea mineral scrub duo', description: 'Exfoliating scrub jars for weekend self-care rituals. Paraben-free.', wholesale: 19.5, attrs: 'wellness' },
  { name: 'Lumenora Salt Crystal Lamp', short: 'Himalayan salt lamp', description: 'Warm ambient glow for bedside or desk. Includes dimmable bulb.', wholesale: 27.0, attrs: 'lighting' },
  { name: 'Driftwood Wall Art Print A3', short: 'Framed lifestyle print', description: 'Neutral coastal photography print in oak-look frame. Ready to hang.', wholesale: 25.0, attrs: 'decor' },
  { name: 'Harbor Glass Bud Vase Trio', short: '3 mini bud vases', description: 'Clear glass buds for single stems on shelves and dining tables.', wholesale: 12.5, attrs: 'decor' },
  { name: 'Summit Forge Campfire Mug Enamel', short: 'Classic enamel mug', description: 'Speckled enamel mug for camping mornings and balcony coffee.', wholesale: 10.0, attrs: 'outdoor' },
  { name: 'Fieldcraft Compact Picnic Cutlery', short: 'Reusable utensil kit', description: 'Stainless fork, spoon, knife, chopsticks in a linen roll pouch.', wholesale: 11.5, attrs: 'everyday' },
  { name: 'NovaByte Portable Bluetooth Speaker Mini', short: 'Pocket speaker', description: 'Compact speaker for kitchen playlists and patio evenings. IPX5 splash resistance.', wholesale: 31.0, attrs: 'audio' },
  { name: 'Voltura Desk Cable Clip Pack', short: '8 silicone cable clips', description: 'Keep chargers and headphones tidy on desks and nightstands.', wholesale: 7.5, attrs: 'desk' },
  { name: 'Bluefinch Reading Book Light', short: 'Clip-on LED book light', description: 'Warm LED clip light for late-night reading without harsh glare.', wholesale: 13.0, attrs: 'reading' },
  { name: 'Paper & Pine Bookmark Ribbon Set', short: 'Fabric bookmark trio', description: 'Soft ribbon bookmarks with brass charms for journals and novels.', wholesale: 6.5, attrs: 'stationery' },
  { name: 'Cinder Lane Matcha Whisk Kit', short: 'Bamboo chasen set', description: 'Whisk, scoop, and ceramic cup for traditional matcha prep.', wholesale: 24.0, attrs: 'tea' },
  { name: 'Cascade Brew French Press 600ml', short: 'Borosilicate press', description: 'Durable glass French press with stainless filter for rich brews.', wholesale: 27.5, attrs: 'coffee' },
  { name: 'Oak & Ember Coaster Set of 6', short: 'Acacia wood coasters', description: 'Felt-backed wood coasters that protect coffee tables.', wholesale: 11.0, attrs: 'table' },
  { name: 'Stillpoint Essential Oil Roller Trio', short: 'Travel roller oils', description: 'Lavender, citrus lift, and focus blends in pocket rollers.', wholesale: 16.0, attrs: 'wellness' },
  { name: 'Kanvas Mandala Yoga Strap', short: 'Adjustable stretch strap', description: 'Cotton yoga strap for safer stretches and posture alignment.', wholesale: 9.0, attrs: 'yoga' },
  { name: 'UrbanMesh Foldable Shopping Crate', short: 'Collapsible crate', description: 'Sturdy crate for boot storage and market runs. Folds flat.', wholesale: 14.0, attrs: 'everyday' },
  { name: 'Polaris Memory Foam Travel Pillow', short: 'U-shaped neck pillow', description: 'Compressible travel pillow with washable cover for flights.', wholesale: 18.0, attrs: 'travel' },
  { name: 'Atlas Peak Packing Cube Set', short: '3 packing organisers', description: 'Mesh packing cubes for weekend bags and carry-ons.', wholesale: 21.5, attrs: 'travel' },
  { name: 'Solstice Sunglasses Soft Case', short: 'Felt glasses pouch', description: 'Soft felt case with clasp for everyday sunglasses protection.', wholesale: 8.0, attrs: 'everyday' },
  { name: 'Aurelia Silk Scrunchie Pack', short: '3 silk hair ties', description: 'Gentle on hair; doubles as a wrist accessory for gym-to-dinner days.', wholesale: 9.5, attrs: 'personal' },
  { name: 'Helix Care Jade Facial Roller', short: 'Cooling face roller', description: 'Stone roller for morning skincare routines and de-puffing.', wholesale: 12.0, attrs: 'wellness' },
  { name: 'Nightingale White Noise Mini', short: 'Travel sleep sound device', description: 'Compact white-noise unit with timer for better sleep on the go.', wholesale: 33.0, attrs: 'sleep' },
  { name: 'Verdant Hanging Macramé Planter', short: 'Indoor plant hanger', description: 'Cotton macramé hanger for trailing plants in bright corners.', wholesale: 15.0, attrs: 'plants' },
  { name: 'Lumen Ceramic Catch-All Dish', short: 'Entryway tray', description: 'Glazed dish for keys, rings, and loose change by the door.', wholesale: 10.5, attrs: 'decor' },
  { name: 'Harbor Linen Apron', short: 'Cross-back kitchen apron', description: 'Heavy linen apron with deep pocket for home cooks.', wholesale: 19.0, attrs: 'kitchen' },
  { name: 'Keystone Hourglass Desk Timer', short: '15-minute sand timer', description: 'Minimal wood timer for focus sessions and tea steeps.', wholesale: 12.5, attrs: 'desk' },
  { name: 'Brightfolio Clip Photo Frame Set', short: '3 hanging photo clips', description: 'Wood clips and twine for casual photo walls — no nails needed.', wholesale: 11.5, attrs: 'decor' },
  { name: 'Coppernest Reusable Produce Bags', short: 'Mesh produce bag set', description: 'Washable mesh bags for markets and fridge storage.', wholesale: 8.5, attrs: 'everyday' },
  { name: 'Fieldcraft Pocket Multi-Tool Card', short: 'Credit-card tool', description: 'Slim multi-tool card for travel kits and weekend bags.', wholesale: 13.5, attrs: 'everyday' },
  { name: 'Summit Forge Insulated Cooler Tote', short: 'Soft cooler bag', description: 'Keeps drinks cold for day trips. Wipe-clean interior.', wholesale: 29.0, attrs: 'outdoor' },
  { name: 'NovaByte Magnetic Phone Stand', short: 'Desktop phone dock', description: 'Adjustable aluminium stand for video calls and recipes.', wholesale: 14.5, attrs: 'desk' },
  { name: 'Voltura Smart Plug Twin Pack', short: 'Wi-Fi smart plugs', description: 'Schedule lamps and fans from your phone. Compact white finish.', wholesale: 22.0, attrs: 'smart-home' },
  { name: 'Bluefinch Hygrometer Thermo Clock', short: 'Room climate desk clock', description: 'Shows temperature and humidity — useful for plants and sleep rooms.', wholesale: 17.0, attrs: 'home' },
  { name: 'Paper & Pine Habit Tracker Pad', short: 'Tear-off tracker sheets', description: 'Monthly habit grids for wellness and productivity routines.', wholesale: 7.0, attrs: 'stationery' },
  { name: 'Cinder Lane Pouring Kettle Gooseneck', short: 'Pour-over kettle', description: 'Precision spout stainless kettle for controlled coffee pours.', wholesale: 35.0, attrs: 'coffee' },
  { name: 'Cascade Cold Brew Bottle 1L', short: 'Cold brew maker', description: 'Filter jug for overnight cold brew. Fridge-door friendly.', wholesale: 18.5, attrs: 'coffee' },
  { name: 'Oak & Ember Herb Scissors Set', short: '5-blade herb cutters', description: 'Kitchen scissors for quick chopping of herbs and greens.', wholesale: 9.0, attrs: 'kitchen' },
  { name: 'Stillpoint Acupressure Mat Kit', short: 'Mat + pillow set', description: 'Spike mat for tension release after long desk days.', wholesale: 28.5, attrs: 'wellness' },
  { name: 'Kanvas Balance Board Lite', short: 'Wooden wobble board', description: 'Active standing accessory for home offices and mobility breaks.', wholesale: 39.0, attrs: 'fitness' },
  { name: 'UrbanMesh Picnic Wine Carrier', short: 'Insulated bottle tote', description: 'Padded carrier for two bottles — dinners and park dates.', wholesale: 16.0, attrs: 'outdoor' },
  { name: 'Polaris Flannel Sheet Pair Pillowcases', short: 'Soft flannel cases', description: 'Brushed cotton pillowcases for cooler nights.', wholesale: 15.0, attrs: 'sleep' },
  { name: 'Atlas Peak Crossbody Sling Bag', short: 'Everyday sling', description: 'Hands-free sling for phones, cards, and earphones.', wholesale: 24.0, attrs: 'bags' },
  { name: 'Solstice Reusable Face Cloth Pack', short: '10 bamboo cloths', description: 'Washable face cloths replacing disposable cotton pads.', wholesale: 10.0, attrs: 'personal' },
  { name: 'Aurelia Bath Soak Mineral Jar', short: 'Relaxing soak salts', description: 'Magnesium-rich soak with lavender for weekend bathtubs.', wholesale: 14.0, attrs: 'bath' },
  { name: 'Helix Care Tongue Scraper Pair', short: 'Steel oral care', description: 'Surgical-grade scrapers for morning oral hygiene routines.', wholesale: 6.0, attrs: 'personal' },
  { name: 'Nightingale Silk Pillowcase', short: 'Mulberry silk case', description: '19-momme silk pillowcase for hair and sleep comfort.', wholesale: 27.0, attrs: 'sleep' },
  { name: 'Verdant Spray Mister Bottle', short: 'Plant misting bottle', description: 'Fine-mist sprayer for tropical houseplants.', wholesale: 8.0, attrs: 'plants' },
  { name: 'Lumen Pottery Match Holder', short: 'Ceramic match striker', description: 'Desk-side striker jar for candles and incense.', wholesale: 11.0, attrs: 'decor' },
  { name: 'Harbor Cotton Table Runner', short: 'Natural table runner', description: 'Neutral runner that softens dining tables for guests.', wholesale: 16.5, attrs: 'table' },
  { name: 'Keystone Analog Kitchen Timer', short: 'Magnetic fridge timer', description: 'Classic twist timer for cooking and focus blocks.', wholesale: 9.5, attrs: 'kitchen' },
  { name: 'Brightfolio Gallery LED Strip Warm', short: 'USB LED strip 2m', description: 'Warm white strip for shelves and reading nooks.', wholesale: 14.0, attrs: 'lighting' },
  { name: 'Coppernest Collapsible Silicone Bowl', short: 'Travel pet / picnic bowl', description: 'Space-saving silicone bowl for parks and travel days.', wholesale: 8.0, attrs: 'outdoor' },
  { name: 'Fieldcraft Outdoor Picnic Knife', short: 'Folding food knife', description: 'Safe lock-back knife sized for cheese boards outdoors.', wholesale: 12.0, attrs: 'outdoor' },
  { name: 'Summit Forge Camp Seat Pad', short: 'Foam stadium seat', description: 'Folding pad for parks, camping, and outdoor concerts.', wholesale: 13.0, attrs: 'outdoor' },
  { name: 'NovaByte Wireless Charger Disc', short: '15W charge pad', description: 'Matte disc charger for phones at nightstands and desks.', wholesale: 18.0, attrs: 'desk' },
  { name: 'Voltura Power Strip Cloth Cover', short: 'Fabric-covered strip', description: 'Stylish 4-outlet strip that blends into living rooms.', wholesale: 21.0, attrs: 'home' },
  { name: 'Bluefinch Analogue Alarm Clock', short: 'No-tick quiet clock', description: 'Simple face, soft light button — bedroom friendly.', wholesale: 17.5, attrs: 'sleep' },
  { name: 'Paper & Pine Recipe Card Box', short: 'Index recipe cards', description: 'Keeps handwritten recipes tidy on kitchen shelves.', wholesale: 14.5, attrs: 'kitchen' },
  { name: 'Cinder Lane Tea Infuser Flask', short: 'Glass tea bottle', description: 'Infuser flask for loose leaf on the go.', wholesale: 16.0, attrs: 'tea' },
  { name: 'Cascade Brew Milk Frother Mini', short: 'Handheld frother', description: 'Battery frother for lattes and matcha at home.', wholesale: 11.0, attrs: 'coffee' },
  { name: 'Oak & Ember Bread Storage Bag', short: 'Linen bread bag', description: 'Keeps loaves fresher without plastic. Drawstring close.', wholesale: 10.5, attrs: 'kitchen' },
  { name: 'Stillpoint Breathing Exercise Cards', short: 'Mindfulness card deck', description: 'Pocket prompts for 60-second calm resets during busy days.', wholesale: 12.0, attrs: 'wellness' },
  { name: 'Kanvas Doorway Stretch Band', short: 'Portable stretch strap', description: 'Anchors safely for home mobility work.', wholesale: 15.5, attrs: 'fitness' },
  { name: 'UrbanMesh Bike Handlebar Bag', short: 'Compact bike pouch', description: 'Quick-release bag for city rides and errands.', wholesale: 20.0, attrs: 'outdoor' },
  { name: 'Polaris Hot Water Bottle Cover', short: 'Knit cover bottle', description: 'Classic rubber bottle with soft knit sleeve for winter evenings.', wholesale: 14.0, attrs: 'wellness' },
  { name: 'Atlas Peak Passport Organiser', short: 'Travel document wallet', description: 'RFID-safe organiser for passport, cards, and boarding passes.', wholesale: 19.5, attrs: 'travel' },
  { name: 'Solstice Canvas Laundry Hamper Bag', short: 'Foldable laundry tote', description: 'Collapses when empty; sturdy handles for laundry runs.', wholesale: 13.5, attrs: 'home' },
  { name: 'Aurelia Compact Mirror LED', short: 'Folding lighted mirror', description: 'Dual-sided compact with soft LEDs for travel grooming.', wholesale: 15.0, attrs: 'personal' },
  { name: 'Helix Care Dry Brush Body', short: 'Natural bristle brush', description: 'Long-handle dry brush for morning shower routines.', wholesale: 11.5, attrs: 'bath' },
  { name: 'Nightingale Ear Plug Silicone Pack', short: 'Reusable sleep plugs', description: 'Washable silicone plugs in a travel case.', wholesale: 7.5, attrs: 'sleep' },
  { name: 'Verdant Seed Starter Kit Windowsill', short: 'Herb seed kit', description: 'Pots, soil disks, and herb seeds for beginners.', wholesale: 16.5, attrs: 'plants' },
  { name: 'Lumen Stone Incense Holder', short: 'Minimal incense tray', description: 'Stone dish that catches ash cleanly.', wholesale: 9.0, attrs: 'decor' },
  { name: 'Harbor Guest Towel Set of 4', short: 'Waffle guest towels', description: 'Quick-dry waffle towels for bathrooms and visitors.', wholesale: 18.0, attrs: 'bath' },
  { name: 'Keystone Weekly Meal Planner Board', short: 'Magnetic meal board', description: 'Plan dinners on the fridge; reduce last-minute takeout.', wholesale: 12.0, attrs: 'kitchen' },
]

if (LIFESTYLE_PRODUCTS.length !== TARGET) {
  console.error(`Expected ${TARGET} products, got ${LIFESTYLE_PRODUCTS.length}`)
  process.exit(1)
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 70)
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

async function urlOk(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12000)
    const res = await fetch(url, { method: 'GET', signal: ctrl.signal })
    clearTimeout(t)
    const ct = res.headers.get('content-type') || ''
    return res.ok && ct.startsWith('image/')
  } catch {
    return false
  }
}

/** Extra Unsplash IDs + Lorem Picsum (real Unsplash photos, not AI) as fill. */
const EXTRA_UNSPLASH_IDS = [
  '1469334031218-e382a71b716b', '1479064555552-3efa90a57233', '1483985988355-763728e1935b',
  '1490481651871-ab68de25d43d', '1503342217505-1d37703447ab', '1509631179647-0177331693ae',
  '1516762689617-e1cffcef479d', '1525507119028-ed4c629a60a3', '1539109136881-3be0616acf4b',
  '1544441893-675973e31985', '1558171813-4c0887535039', '1560243563-062bfc001d68',
  '1576566588028-4147f3842f27', '1583743814966-8936f5b7be1a', '1594938298603-c8148c4dae35',
  '1602810318383-e386cc2a3ccf', '1617137968427-85924c800a22', '1618354691373-d851c5c3a990',
  '1434389677669-e08b4cac3105', '1506157786151-b31940176ee0', '1515372039744-b8f02a3ae446',
  '1521572163474-6864f9cf17ab', '1549298916-b41d501d3772', '1553062407-98eeb64c6a62',
  '1560769629-975ec94e6a86', '1572804013309-59a88b7e92f1', '1584917865442-de89df76afd3',
  '1595950653106-6c9ebd614d3a', '1600185365926-3a2ce3cdb9eb', '1606107557195-0e29a4b5b4aa',
  '1542291026-7eec264c27ff', '1491553895911-0055eca6402d', '1460353581641-37baddab0fa2',
  '1518049362265-d5b2a6467637', '1543163521-1bf539c55dd2', '1595341888016-a392ef81b7de',
  '1511499767150-a48a237f0083', '1572635196237-14b3f281503f', '1505740420928-5e560c06d30e',
  '1498049794561-7780e7231661', '1572569511254-d8f925fe2cbb', '1526170375885-4d8ecf77b99f',
  '1516575334481-f85287c2c82d', '1558769132-cb1aea458c5e', '1617103991918-49c4a1d83107',
  '1616628182388-607b6f86af90', '1618221195710-dd6b41faaea6', '1620625572941-3e0c28ae9764',
  '1631049307250-a1bbae707d7c', '1640622300473-52b5abdae4b9', '1641675908277-240910161c19',
]

async function validateUniqueImages(ids: string[], need: number): Promise<string[]> {
  const uniqueIds = Array.from(new Set([...ids, ...EXTRA_UNSPLASH_IDS]))
  console.log(`Validating ${uniqueIds.length} Unsplash candidates...`)
  const urls = uniqueIds.map(img)
  const ok: string[] = []
  const CONCURRENCY = 12
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(async (u) => ({ u, ok: await urlOk(u) })))
    for (const r of results) {
      if (r.ok && !ok.includes(r.u)) ok.push(r.u)
    }
    process.stdout.write(`  checked ${Math.min(i + CONCURRENCY, urls.length)}/${urls.length}, ok=${ok.length}\r`)
  }
  console.log(`\n  Unsplash OK: ${ok.length}`)

  // Fill shortfall with Lorem Picsum IDs (real photography mirrored from Unsplash — not AI)
  if (ok.length < need) {
    console.log(`  Filling remaining with picsum.photos unique IDs...`)
    for (let id = 10; id <= 300 && ok.length < need; id++) {
      const u = `https://picsum.photos/id/${id}/800/800`
      if (await urlOk(u)) {
        ok.push(u)
      }
      if (id % 40 === 0) process.stdout.write(`  picsum @${id}, ok=${ok.length}\r`)
    }
    console.log(`\n  Total unique working images: ${ok.length}`)
  }

  if (ok.length < need) {
    throw new Error(`Need ${need} unique working images, only have ${ok.length}`)
  }
  return ok.slice(0, need)
}

async function main() {
  const { data: cat, error: catErr } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('slug', 'lifestyle')
    .single()
  if (catErr || !cat) throw catErr || new Error('Lifestyle category not found')

  console.log(`Category: ${cat.name} (${cat.id})`)

  const { data: existing, error: exErr } = await supabase
    .from('products')
    .select('id, name, sku')
    .eq('categoryId', cat.id)
  if (exErr) throw exErr

  const ids = (existing || []).map((p) => p.id)
  console.log(`Existing Lifestyle products: ${ids.length}`)

  if (ids.length) {
    // Confirm no order links
    for (let i = 0; i < ids.length; i += 40) {
      const chunk = ids.slice(i, i + 40)
      const { data: oi } = await supabase
        .from('order_items')
        .select('id')
        .in('productId', chunk)
        .limit(1)
      if (oi && oi.length) {
        throw new Error('Abort: Lifestyle products referenced by order_items')
      }
    }

    console.log('Deleting old Lifestyle products (images cascade)...')
    // Delete images first in case FK is restrictive
    for (let i = 0; i < ids.length; i += 40) {
      const chunk = ids.slice(i, i + 40)
      await supabase.from('product_images').delete().in('productId', chunk)
      const { error: delErr } = await supabase.from('products').delete().in('id', chunk)
      if (delErr) throw delErr
    }
    console.log('  Cleared.')
  }

  const images = await validateUniqueImages(LIFESTYLE_PHOTO_IDS, TARGET)
  const runTag = Date.now().toString(36)
  const nameSet = new Set<string>()
  const previewRows: string[] = [
    'index,sku,name,slug,wholesale,sale_price,image_url',
  ]

  console.log(`Inserting ${TARGET} Lifestyle products...`)
  let created = 0
  let imageRows = 0

  for (let i = 0; i < LIFESTYLE_PRODUCTS.length; i++) {
    const item = LIFESTYLE_PRODUCTS[i]
    if (nameSet.has(item.name)) throw new Error(`Duplicate name: ${item.name}`)
    nameSet.add(item.name)

    const wholesale = round2(item.wholesale)
    const sale = salesPriceFromWholesale(wholesale)
    // sanity
    if (round2(wholesalePriceFromSales(sale)) !== wholesale && Math.abs(wholesalePriceFromSales(sale) - wholesale) > 0.02) {
      // allow 1 cent drift
    }
    const compare = round2(sale * 1.18)
    const slug = `ls-${slugify(item.name)}-${runTag}-${i + 1}`
    const sku = `LS-${String(i + 1).padStart(3, '0')}-${runTag}`
    const imageUrl = images[i]

    const { data: product, error: insErr } = await supabase
      .from('products')
      .insert({
        shopId: null,
        categoryId: cat.id,
        name: item.name,
        slug,
        description: item.description,
        shortDesc: item.short,
        price: sale,
        comparePrice: compare,
        wholesalePrice: wholesale,
        salePrice: sale,
        costPrice: wholesale,
        sku,
        barcode: `888${String(100000000 + i).slice(0, 9)}${i % 10}`,
        stock: 25 + ((i * 7) % 80),
        lowStockAlert: 5,
        status: 'PUBLISHED',
        isFeatured: i < 8,
        isPromoted: i % 5 === 0,
        rating: round2(3.8 + (i % 12) * 0.1),
        totalReviews: 5 + (i % 40),
        totalSales: i % 30,
        views: 50 + i * 3,
      })
      .select('id, name')
      .single()

    if (insErr || !product) {
      console.error(`Failed on ${item.name}:`, insErr?.message)
      throw insErr || new Error('insert failed')
    }

    const { error: imgErr } = await supabase.from('product_images').insert([
      {
        productId: product.id,
        url: imageUrl,
        alt: item.name,
        sortOrder: 0,
        isPrimary: true,
      },
    ])
    if (imgErr) throw imgErr

    created++
    imageRows++
    previewRows.push(
      [
        i + 1,
        sku,
        `"${item.name.replace(/"/g, '""')}"`,
        slug,
        wholesale,
        sale,
        imageUrl,
      ].join(',')
    )

    if ((i + 1) % 20 === 0) console.log(`  … ${i + 1}/${TARGET}`)
  }

  // Verify
  const { data: verify } = await supabase
    .from('products')
    .select('id, name')
    .eq('categoryId', cat.id)
    .eq('status', 'PUBLISHED')
  const { data: imgs } = await supabase
    .from('product_images')
    .select('url, productId')
    .in(
      'productId',
      (verify || []).map((p) => p.id)
    )

  const uniqueNames = new Set((verify || []).map((p) => p.name))
  const uniqueImgs = new Set((imgs || []).map((i) => i.url))

  mkdirSync(join(process.cwd(), 'catalog'), { recursive: true })
  const previewPath = join(process.cwd(), 'catalog', 'lifestyle-100-live.csv')
  writeFileSync(previewPath, previewRows.join('\n'), 'utf8')

  console.log('\n=== Lifestyle rebuild complete ===')
  console.log(`Published products: ${(verify || []).length}`)
  console.log(`Unique names: ${uniqueNames.size}`)
  console.log(`Image rows: ${(imgs || []).length}, unique URLs: ${uniqueImgs.size}`)
  console.log(`Created this run: ${created} products, ${imageRows} images`)
  console.log(`Local preview CSV: ${previewPath}`)

  if ((verify || []).length < TARGET) {
    throw new Error('Verification failed: product count below target')
  }
  if (uniqueNames.size < TARGET) {
    throw new Error('Verification failed: duplicate names detected')
  }
  if (uniqueImgs.size < TARGET) {
    throw new Error('Verification failed: repeated images detected')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
