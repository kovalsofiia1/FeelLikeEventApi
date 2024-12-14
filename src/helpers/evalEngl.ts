// import lingvanex from '@api/lingvanex';
// import Sentiment from 'sentiment';

// async function getText(event) {
//   const eventText = event?.name + ' ' + event?.description + ' ' + event.tags;

//   try {
//     // Perform translation asynchronously
//     lingvanex.auth(process.env.TRANSLATION_API_KEY || '');
//     const { data } = await lingvanex.postTranslate({
//       platform: 'api',
//       from: 'uk',
//       to: 'en',
//       data: eventText
//     });

//     // Return the translated text
//     return data.result || eventText;
//   } catch (err) {
//     console.error(err);
//     return eventText;
//   }
// }

// // Function to analyze sentiment and categorize mood
// export async function analyzeMood(event) {
//   // 1. Preprocess text: Tokenize and clean the event description
//   const sentiment = new Sentiment();

//   const eventDescription = await getText(event);

//   console.log(eventDescription)
//   const analysis = sentiment.analyze(eventDescription)
//   console.log(analysis)
//   return analysis
// }