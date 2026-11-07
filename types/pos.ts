export const POS_PRODUCT_CARD_SIZES = ['xs', 'sm', 'md', 'l', 'xl', 'xxl'] as const

export type POSProductCardSize = (typeof POS_PRODUCT_CARD_SIZES)[number]

export const POS_CART_WIDTHS = ['320', '360', '400', '440', '500', '650', '800', '1000'] as const

export type POSCartWidth = (typeof POS_CART_WIDTHS)[number]
