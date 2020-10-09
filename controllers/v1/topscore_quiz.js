var const_data = require('../../config/aws-config');
const auth = require('../../middleware/authentication_service');
const csv = require('csvtojson')
exports.topscorequiz= async function (req, res) {
    try{
    const_data['getParams']['Key'] = 'mantra/top_scorers_quiz/top_scorers_quiz.csv'
    async function csvToJSON() {
        var params = {
            Bucket: const_data['getParams']['Bucket'],
            Key: const_data['getParams']['Key'],
          };
          const_data['s3'].headObject(params, async function (err, metadata) {
            if (err && err.code === 'NotFound') {
              res.status(403).json({ errMsg: 'No such data found' });
            } else {
              const stream = const_data['s3'].getObject(const_data['getParams']).createReadStream();
              const json = await csv().fromStream(stream);
              res.status(200).send(json);
            }
          });
    }
    csvToJSON()
}
catch (e) {
    console.log(e);
    res.status(500).json({ errMessage: "Internal error. Please try again!!" });
}

    };

