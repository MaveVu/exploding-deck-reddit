const DECK_COL = ['yellow_1.png', 'yellow_2.png', 'yellow_3.png', 'yellow_4.png', 'yellow_5.png', 'yellow_6.png', 'yellow_7.png', 'yellow_8.png', 'yellow_9.png', 'yellow_10.png', 'blue_1.png', 'blue_2.png', 'blue_3.png', 'blue_4.png', 'blue_5.png', 'blue_6.png', 'blue_7.png', 'blue_8.png', 'blue_9.png', 'blue_10.png', 'green_1.png', 'green_2.png', 'green_3.png', 'green_4.png', 'green_5.png', 'green_6.png', 'green_7.png', 'green_8.png', 'green_9.png', 'green_10.png', 'red_1.png', 'red_2.png', 'red_3.png', 'red_4.png', 'red_5.png', 'red_6.png', 'red_7.png', 'red_8.png', 'red_9.png', 'red_10.png'];
const SPECIAL = ['x.png', 'high.png', 'draw3.png', 'back1.png'];
const EXPLOSION = ['explosion.png'];
export const COLOR = ['Y', 'R', 'B', 'G'];
export const INSTRUCTION = ['inst_general.png', 'inst_boom.png', 'inst_back1.png', 'inst_draw3.png', 'inst_high.png', 'inst_x.png'];


// Generate DECK (3 * color deck + 4 special cards + 4 booms)
const rep_DECK_COL = Array(3).fill(DECK_COL).flat();
const rep_EXP = Array(4).fill(EXPLOSION).flat();
export const DECK = rep_DECK_COL.concat(SPECIAL, rep_EXP);
