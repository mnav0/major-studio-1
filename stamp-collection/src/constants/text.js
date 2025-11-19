// regex to store words within the context paragraphs that can be used to filter stamps based on title and description
const contextWords = [
  /\bcrown\b/i,
  /\bpostmark\b/i,
  /\bEmbossed\b/i,
  /\bPost Office\b/i,
  /\bwar\b/i,
  /\bConfederate\b/i,
  /\bUnion\b/i,
  /\bTax\b/i,
  /\bCommemorative\b/i,
  /\bStamp Act\b/i,
  /\bRevolutionary\b/i,
  /\bRevolution\b/i,
  /\bColumbus\b/i,
  /\bFreedom\b/i,
  /\bIndependence\b/i,
  /\bCivil War\b/i,
  /\bReconstruction\b/i,
  /\bGilded Age\b/i,
  /\bDiscovery\b/i,
  /\bcancel\b/i,
  /\bAmerican\b/i,
  /\bBritish\b/i,
  /\bissue\b/i,
  /\bpopular\b/i,
]

// build a regex that matches any of the context words
const contextRegex = new RegExp(contextWords.map(word => word.source).join('|'), 'gi');

export default contextRegex;