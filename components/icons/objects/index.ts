/**
 * Trolley object glyphs. Import from `@/components/icons/objects`.
 *
 * `OBJECT_ICONS` is keyed by every id in `OBJECT_ICON_IDS`, so a catalogue entry's
 * `icon` always resolves — the type checker enforces that the two stay in step.
 */
import { BabyIcon } from "./baby";
import { BirdIcon } from "./bird";
import { BookIcon } from "./book";
import { BoyIcon } from "./boy";
import { BullIcon } from "./bull";
import { CalfIcon } from "./calf";
import { CatIcon } from "./cat";
import { ChickenIcon } from "./chicken";
import { ChildIcon } from "./child";
import { CoupleIcon } from "./couple";
import { CowIcon } from "./cow";
import { CrateIcon } from "./crate";
import { DogIcon } from "./dog";
import { ElderManIcon } from "./elder-man";
import { ElderWomanIcon } from "./elder-woman";
import { GirlIcon } from "./girl";
import type { ObjectIconComponent } from "./glyph";
import { GoatIcon } from "./goat";
import { GoldIcon } from "./gold";
import { GroupIcon } from "./group";
import { HamsterIcon } from "./hamster";
import { HorseIcon } from "./horse";
import type { ObjectIconId } from "./ids";
import { KittenIcon } from "./kitten";
import { ManIcon } from "./man";
import { MoneyIcon } from "./money";
import { PaintingIcon } from "./painting";
import { PersonIcon } from "./person";
import { PigIcon } from "./pig";
import { PregnantWomanIcon } from "./pregnant-woman";
import { PuppyIcon } from "./puppy";
import { QuestionIcon } from "./question";
import { RhinoIcon } from "./rhino";
import { RobotIcon } from "./robot";
import { ScrollIcon } from "./scroll";
import { SculptureIcon } from "./sculpture";
import { SheepIcon } from "./sheep";
import { TeenIcon } from "./teen";
import { WomanIcon } from "./woman";

export const OBJECT_ICONS: Record<ObjectIconId, ObjectIconComponent> = {
  person: PersonIcon,
  man: ManIcon,
  woman: WomanIcon,
  "elder-man": ElderManIcon,
  "elder-woman": ElderWomanIcon,
  "pregnant-woman": PregnantWomanIcon,
  teen: TeenIcon,
  child: ChildIcon,
  boy: BoyIcon,
  girl: GirlIcon,
  baby: BabyIcon,
  couple: CoupleIcon,
  group: GroupIcon,
  dog: DogIcon,
  puppy: PuppyIcon,
  cat: CatIcon,
  kitten: KittenIcon,
  bird: BirdIcon,
  hamster: HamsterIcon,
  cow: CowIcon,
  bull: BullIcon,
  calf: CalfIcon,
  horse: HorseIcon,
  sheep: SheepIcon,
  goat: GoatIcon,
  pig: PigIcon,
  chicken: ChickenIcon,
  rhino: RhinoIcon,
  money: MoneyIcon,
  gold: GoldIcon,
  painting: PaintingIcon,
  sculpture: SculptureIcon,
  book: BookIcon,
  scroll: ScrollIcon,
  robot: RobotIcon,
  crate: CrateIcon,
  question: QuestionIcon,
};

/** The component for `icon`, falling back to the question mark for an unknown id. */
export function objectIcon(icon: string): ObjectIconComponent {
  return icon in OBJECT_ICONS ? OBJECT_ICONS[icon as ObjectIconId] : QuestionIcon;
}

export { OBJECT_ICON_IDS, isObjectIconId, type ObjectIconId } from "./ids";
export {
  FIGURES,
  Figure,
  GLYPH_PEN,
  GLYPH_VIEWBOX,
  GlyphFrame,
  Legs,
  useGlyphPen,
  type GlyphPen,
  type ObjectIconComponent,
  type ObjectIconProps,
} from "./glyph";
