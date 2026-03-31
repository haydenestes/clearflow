/**
 * ClearFlow — Merchant Intelligence Library
 * Maps merchant names/keywords → expense categories
 */

const MERCHANT_RULES = {
  groceries: {
    label: 'Groceries',
    icon: '🛒',
    color: '#5ca87a',
    keywords: [
      'trader joe', 'safeway', 'albertsons', 'whole foods', 'wholefds', 'berkeley bowl',
      'king soopers', 'kroger', 'sprouts', 'lucky', 'vons', 'ralph', 'publix',
      'heb ', 'meijer', 'aldi', 'lidl', 'costco whse', 'costco food', 'sam\'s club',
      'raley', 'nob hill', 'smart & final', 'winco', 'food maxx', 'savemart',
      'grocery outlet', 'market', 'food 4 less', 'stater bros', 'piazza', 'mollie stone',
      'bi-rite', 'rainbow grocery', 'good eggs', 'imperfect', 'instacart',
    ],
  },
  dining: {
    label: 'Dining & Bars',
    icon: '🍽️',
    color: '#c9a84c',
    keywords: [
      'restaurant', 'cafe', 'coffee', 'bar ', 'bistro', 'grill', 'kitchen', 'eatery',
      'pizza', 'burger', 'taco', 'sushi', 'ramen', 'diner', 'brasserie', 'brasserie',
      'donut', 'bakery', 'sandwich', 'deli', 'bagel', 'poke', 'thai', 'chinese', 'mexican',
      'italian', 'steakhouse', 'chophouse', 'tavern', 'pub ', 'lounge', 'brewery', 'brewing',
      'winery', 'wine bar', 'cocktail', 'starbucks', 'peet\'s', 'blue bottle', 'philz',
      'dutch bros', 'dunkin', 'tim horton', 'panera', 'chipotle', 'sweetgreen',
      'shake shack', 'in-n-out', 'five guys', 'habit burger', 'mcdonald', 'wendy',
      'taco bell', 'subway', 'jersey mike', 'firehouse', 'jimmy john',
      'doordash', 'uber eats', 'grubhub', 'postmates', 'seamless',
      'tst*', 'sq *', 'toast', // POS systems
    ],
  },
  amazon: {
    label: 'Amazon',
    icon: '📦',
    color: '#f0a030',
    keywords: [
      'amazon', 'amzn', 'aws ', 'kindle', 'audible', 'prime video', 'amazon prime',
    ],
  },
  pets: {
    label: 'Pets',
    icon: '🐾',
    color: '#8b5e8b',
    keywords: [
      'petsmart', 'petco', 'pet supplies', 'petland', 'pet food', 'pet store',
      'chewy', 'petflow', 'entirely pets', 'vetcove', 'vet ', 'veterinar',
      'animal hospital', 'animal clinic', 'pet clinic', 'dog groo', 'cat groo',
      'pet groo', 'dog wash', 'pet wash', 'doggy', 'puppy', 'pawp',
      'fetch pet', 'wag ', 'rover ', 'bark box', 'barkbox',
    ],
  },
  travel: {
    label: 'Travel',
    icon: '✈️',
    color: '#5c8ab8',
    keywords: [
      'airbnb', 'vrbo', 'hotel', 'hilton', 'marriott', 'hyatt', 'westin', 'sheraton',
      'ihg', 'holiday inn', 'hampton inn', 'courtyard', 'doubletree', 'fairmont',
      'four seasons', 'kimpton', 'ace hotel', 'w hotel', 'renaissance',
      'united airlines', 'delta', 'american airlines', 'southwest', 'jetblue',
      'alaska airlines', 'spirit', 'frontier', 'sunwing', 'airasia', 'air asia',
      'amex travel', 'expedia', 'booking.com', 'kayak', 'priceline', 'hopper',
      'enterprise', 'hertz', 'avis', 'budget car', 'national car', 'alamo',
      'uber airport', 'lyft airport', 'grab*', // Southeast Asia rideshare
      'devils thumb', 'lodge', 'resort', 'inn ', ' inn', 'motel',
    ],
  },
  transportation: {
    label: 'Gas & Transportation',
    icon: '⛽',
    color: '#7a9ab8',
    keywords: [
      'chevron', 'shell', 'arco', 'bp ', 'exxon', 'mobil', 'valero', 'texaco',
      'speedway', 'circle k', 'wawa', 'sheetz', 'kwik trip', 'pilot', 'loves ',
      'costco gas', 'sam\'s gas', 'fuel', 'gas station',
      'uber', 'lyft', 'taxi', 'cab ', 'clipper', 'bart ', 'muni ', 'transit',
      'metro ', 'parking', 'parkwhiz', 'spothero', 'impark', 'ampco',
      'fastrak', 'e-zpass', 'sunpass', 'pikepass',
    ],
  },
  shopping: {
    label: 'Shopping & Retail',
    icon: '🛍️',
    color: '#c97a5c',
    keywords: [
      'target', 'walmart', 'walgreens', 'cvs ', 'rite aid', 'duane reade',
      'macy\'s', 'nordstrom', 'bloomingdale', 'saks', 'neiman', 'anthropologie',
      'free people', 'lululemon', 'nike', 'adidas', 'gap ', 'banana republic',
      'old navy', 'h&m ', 'zara', 'uniqlo', 'everlane', 'madewell',
      'j.crew', 'jcrew', 'brooks brothers', 'bonobos', 'allbirds',
      'best buy', 'apple store', 'apple online', 'microsoft', 'b&h photo',
      'home depot', 'lowe\'s', 'ikea', 'west elm', 'pottery barn', 'cb2',
      'crate & barrel', 'wayfair', 'overstock',
      'tj maxx', 'marshalls', 'ross ', 'burlington',
    ],
  },
  subscriptions: {
    label: 'Subscriptions',
    icon: '📱',
    color: '#6b8f71',
    keywords: [
      'netflix', 'hulu', 'disney+', 'hbo max', 'peacock', 'paramount+',
      'spotify', 'apple music', 'tidal', 'pandora', 'sirius xm',
      'apple.com/bill', 'google play', 'google one', 'icloud', 'dropbox',
      'microsoft 365', 'adobe', 'notion', 'slack', 'zoom ', 'openai',
      'chatgpt', 'anthropic', 'youtube tv', 'youtube premium',
      'hinge', 'tinder', 'bumble', 'match.com', 'duolingo',
      'nytimes', 'wsj ', 'washington post', 'the atlantic', 'substack',
      'linkedin premium', 'masterclass', 'skillshare', 'coursera',
    ],
  },
  health: {
    label: 'Health & Wellness',
    icon: '💊',
    color: '#5ca87a',
    keywords: [
      'cvs pharmacy', 'walgreens pharm', 'rite aid pharm', 'pharmacy',
      'doctor', 'dentist', 'optometrist', 'chiropractor', 'therapist',
      'hospital', 'urgent care', 'clinic ', 'medical', 'health',
      'lab corp', 'quest diagnostics', 'planned parenthood',
    ],
  },
  fitness: {
    label: 'Gym & Fitness',
    icon: '🏋️',
    color: '#4a8c8c',
    keywords: [
      'gym', 'fitness', 'crossfit', 'orange theory', 'orangetheory', 'solidcore',
      'peloton', 'planet fitness', 'equinox', 'la fitness', '24 hour fitness',
      'ymca', 'gold\'s gym', 'anytime fitness', 'crunch fitness',
      'funky door', 'barry\'s', 'pure barre', 'soul cycle', 'soulcycle',
      'yoga', 'pilates', 'mindbody', 'classpass',
    ],
  },
  entertainment: {
    label: 'Entertainment & Events',
    icon: '🎉',
    color: '#9b7db8',
    keywords: [
      'ticketmaster', 'stubhub', 'seatgeek', 'axs ', 'eventbrite',
      'amc ', 'regal', 'cinemark', 'alamo draft', 'imax',
      'bowling', 'topgolf', 'mini golf', 'arcade', 'dave & buster',
      'escape room', 'comedy club', 'theater', 'theatre', 'concert',
      'museum', 'zoo ', 'aquarium', 'theme park', 'six flags', 'disney',
    ],
  },
  rent: {
    label: 'Rent / Mortgage',
    icon: '🏠',
    color: '#b85c5c',
    keywords: [
      'rent', 'mortgage', 'lease', 'landlord', 'property mgmt', 'zillow rental',
    ],
  },
};

// Export for browser
if (typeof window !== 'undefined') {
  window.MERCHANT_RULES = MERCHANT_RULES;
}
