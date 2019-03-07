let AWS = require('aws-sdk');

exports.handler = async (event) => {
	let messages = event.Document.Msg;
	if (!Array.isArray(messages)) {
		messages = [messages];
	}

	let iotAnalytics = new AWS.IoTAnalytics(); 
	let i = 0;
	let msgStrings = messages.map(message => {
		i++;
		return { messageId: i.toString(), payload: JSON.stringify(message) };
	});

	return await iotAnalytics.batchPutMessage({ channelName: 'push_monitor_messages_channel', messages: msgStrings }).promise();
};