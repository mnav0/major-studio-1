
const themeBuckets = {
  "Founding Figures": [
    "George Washington","Benjamin Franklin","Thomas Jefferson",
    "Alexander Hamilton","James Madison","Daniel Webster","Henry Clay","John Marshall"
  ],
  "Military Figures": [
    "Ulysses Grant","William Sherman","James Garfield","Andrew Jackson",
    "Abraham Lincoln","Jefferson Davis","Oliver Perry","Zachary Taylor",
    "Edwin M. Stanton","Winfield Scott"
  ],
  "Independence": [
    "Liberty","Justice","Freedom","Independence","Peace",
    "Union","Equality","Democracy","Eagle"
  ],
  "Allegories": [
    "Clio", "Ceres","Vesta", "Minerva"
  ],
  "Discovering America": [
    "Christopher Columbus","Queen Isabella","Pilgrim","Mayflower","Centennial","Exposition"
  ],
  "Postal System": [
    "Post Office","Messenger","Newspaper","Manual postmark","Embossed postmark"
  ],
  "Colonization, Control": [
    "British Crown"
  ],
  "War, Victory": [
    "Battle","Soldier","War","Confederate","Victory"
  ],
  "Government": [
    "Constitution","Congress","Treasury","State","Navy","Agriculture","Tax","Locomotive","Adriatic"
  ]
};

const themeNormalization = {
  // Standardize spelling variants
  "isabela": "Queen Isabella",
  "isabella": "Queen Isabella",
  "columbus": "Christopher Columbus",

  "post office": "Post Office",
  "postmaster": "Post Office",
  "postmark": "Post Office",
  "envelope": "Post Office",
  "envelopes": "Post Office",

  "soldier": "Soldier",
  "soldiers": "Soldier",

  "newspaper": "Newspaper",
  "newspapers": "Newspaper",

  "washington": "George Washington",
  "davis": "Jefferson Davis",
  "franklin": "Benjamin Franklin",
  "jefferson": "Thomas Jefferson",
  "hamilton": "Alexander Hamilton",
  "madison": "James Madison",

  "grant": "Ulysses Grant",
  "sherman": "William Sherman",
  "garfield": "James Garfield",

  "jackson": "Andrew Jackson",
  "lincoln": "Abraham Lincoln",
  "webster": "Daniel Webster",
  "clay": "Henry Clay",

  "perry": "Oliver Perry",
  "taylor": "Zachary Taylor",
  "stanton": "Edwin Stanton",
  "marshall": "John Marshall",
  "scott": "Winfield Scott"
};

// Priority order: first match wins if multiple themes present
const themePriority = [
  "George Washington","Benjamin Franklin","Jefferson Davis","Thomas Jefferson","Alexander Hamilton","James Madison",
  "Ulysses Grant","William Sherman","James Garfield","Andrew Jackson","Abraham Lincoln",
  "Daniel Webster","Henry Clay","Oliver Perry","Zachary Taylor",
  "Edwin Stanton","John Marshall","Winfield Scott",
  "Liberty","Justice","Freedom","Independence","Victory","Peace","Union","Equality","Democracy","Eagle",
  "Clio", "Ceres","Vesta", "Minerva",
  "Christopher Columbus","Queen Isabella","Pilgrim","Mayflower","Centennial","Exposition",
  "Post Office","Messenger","Newspaper",
  "Battle","Soldier","War","Confederate",
  "Constitution","Congress","Treasury","State","Navy","Agriculture","Tax","Locomotive","Adriatic"
];

export { themeBuckets, themeNormalization, themePriority };