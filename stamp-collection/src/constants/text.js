// Regex patterns to match words in historical context that can filter stamps by title and description
const contextWords = [
  // Revolutionary & Colonial Era
  /\bRevolutionary\b/i,
  /\bRevolutions?\b/i,
  /\bcolony\b/i,
  /\bcolonies\b/i,
  /\bcrowns?\b/i,
  /\bauthority\b/i,
  /\bopposition\b/i,
  /\bBritish\b/i,
  /\btax(es)?\b/i,
  /\bStamp Acts?\b/i,
  /\bresistance\b/i,
  
  // Founding Leaders
  /\bWashington\b/i,
  /\bFranklin\b/i,
  /\bJefferson\b/i,
  /\bHamilton\b/i,
  
  // Postal System
  /\bpostmarks?\b/i,
  /\binks?\b/i,
  /\bstamps?\b/i,
  /\bproofs?\b/i,
  /\bEmbossed\b/i,
  /\bpostals?\b/i,
  /\bsystems?\b/i,
  
  // Civil War Era
  /\bwars?\b/i,
  /\bCivil Wars?\b/i,
  /\bUnions?\b/i,
  /\bcancels?\b/i,
  /\bmarks?\b/i,
  /\beagles?\b/i,
  /\bmascots?\b/i,
  /\bforces?\b/i,
  /\bMilitary\b/i,
  /\bgenerals?\b/i,
  
  // Reconstruction & Freedom
  /\breconstruct(ing|ion)?\b/i,
  /\bpeace\b/i,
  /\bjustice\b/i,
  /\bfreedom\b/i,
  
  // Gilded Age & Progress
  /\bgrowth\b/i,
  /\bexpositions?\b/i,
  /\bfinancials?\b/i,
  /\bsystems?\b/i,
  
  // Commemorative Era
  /\bcommemorative\b/i,
  /\bColumbus\b/i,
  /\bdiscovery\b/i,
  /\bvoyages?\b/i,
  /\bpopular\b/i,
  /\bfoundat(ion|ional)\b/i,
  /\bhistory\b/i,
  
  // National Identity
  /\bAmericans?\b/i,
  /\bnations?\b/i,
  /\bnational\b/i,
  /\bemblems?\b/i,
  /\bidentity\b/i,
  /\bideals?\b/i,
  /\bsymbols?\b/i,
  /\bimagery\b/i,
  /\bfigures?\b/i,
  
  // First Issues
  /\bfirst\b/i,
  /\bissues?\b/i,
  /\bofficial\b/i,
  /\bfeatures?\b/i,
  /\bleaders?\b/i,
  /\bportrayals?\b/i,
];

// build a regex that matches any of the context words
const contextRegex = new RegExp(contextWords.map(word => word.source).join('|'), 'gi');

export default contextRegex;