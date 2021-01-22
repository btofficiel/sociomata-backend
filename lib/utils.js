const adjustTimestamp = timestamp => {
    return Math.floor(timestamp/60)*60;
}

module.exports = {
    adjustTimestamp
}

