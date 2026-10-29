/** Single-line control height. */
export const FLOATING_FIELD_HEIGHT = 56;

/** Floated labels sit on the surface behind the field and never paint a chip. */
export const FLOATING_LABEL_BACKGROUND = 'transparent';

/** Room above the box so the floated label clears the top stroke. */
export const LABEL_CLEARANCE = 16;

/**
 * Vertical gap between stacked fields.
 * The label clearance sits above each box, so the space from one box to the
 * next is this gap plus that clearance. 9 + 16 = 25, which is 30% tighter
 * than the previous 20 + 16.
 */
export const FIELD_STACK_GAP = 9;
