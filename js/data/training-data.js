// V233 training data combiner. Data parts are loaded before this file.
window.SZO_TRAINING_DATA_PARTS = window.SZO_TRAINING_DATA_PARTS || {};
window.SZO_TRAINING_DATA_GROUPS = window.SZO_TRAINING_DATA_GROUPS || [];
const TRAINING_DATA = Object.assign({}, window.SZO_TRAINING_DATA_PARTS, {
  data: window.SZO_TRAINING_DATA_GROUPS.flatMap(part => part.data || [])
});
window.TRAINING_DATA = TRAINING_DATA;
