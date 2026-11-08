// 3 practice emails + 12 study emails. Study email n is tied to interruption number n (1..12), not to the mode.
// PLACEHOLDER content: fictional senders and companies. Bodies are 40 to 60 words, one simple question each.
export const EMAILS = {
  practice: [
    {
      id: "p1", from: { name: "Jonas Berg", address: "jonas@harbor-studio.example" }, subject: "Lunch on Friday",
      body: "Hi, a few of us from the studio are planning a team lunch this Friday to celebrate the end of the project. We booked a table for twelve at the place near the harbor, but we still need to know who is coming and whether anyone has special dietary needs. Please let me know soon.",
      question: "Will you join the lunch?", options: ["Yes, I will be there", "Maybe, I will confirm later", "No, I cannot make it"]
    },
    {
      id: "p2", from: { name: "Elena Costa", address: "elena@brightpath.example" }, subject: "Printer maintenance",
      body: "Hello, the facilities team will service the shared printers on the second floor tomorrow morning. The machines will be unavailable between nine and eleven, so anything urgent should be printed beforehand. If you have a large print job planned, tell me and I can arrange for a different printer on the third floor.",
      question: "Do you need a printer tomorrow morning?", options: ["Yes, please arrange one", "No, I am fine", "I will print today instead"]
    },
    {
      id: "p3", from: { name: "Tariq Haddad", address: "tariq@oakline-travel.example" }, subject: "Conference travel",
      body: "Good afternoon, I am booking travel for the autumn conference and need your preference before the fares change. There are two morning flights and one evening flight, and the hotel is only a short walk from the venue. Please tell me which departure suits you best so I can reserve it today.",
      question: "Which departure do you prefer?", options: ["The early morning flight", "The late morning flight", "The evening flight"]
    }
  ],
  study: [
    {
      id: "s1", from: { name: "Marta Lindqvist", address: "marta@northwind-logistics.example" }, subject: "Delivery slot for Thursday",
      body: "Hi, I am planning next week's deliveries and noticed your warehouse has two open slots on Thursday. The morning slot fits our driver schedule better because the truck is also needed at another site after lunch. Could you let me know which slot you prefer so I can confirm the booking today?",
      question: "Which slot do you prefer?", options: ["Thursday morning", "Thursday afternoon", "Suggest another day"]
    },
    {
      id: "s2", from: { name: "Oskar Veld", address: "oskar@pinecrest-design.example" }, subject: "Logo colours",
      body: "Hello, the designer sent three colour versions of the new logo and we need to choose one before the printer deadline on Monday. The first is a deep green, the second a warm orange, and the third a calm blue. I would like a quick opinion from you before I decide.",
      question: "Which colour do you like best?", options: ["The deep green", "The warm orange", "The calm blue"]
    },
    {
      id: "s3", from: { name: "Priya Nair", address: "priya@lakeside-clinic.example" }, subject: "Appointment reminder",
      body: "Dear patient, this is a reminder that your check-up is scheduled for next Tuesday at ten in the morning. Please arrive fifteen minutes early to complete the forms at the front desk. If the time no longer works for you, we can move the appointment to Wednesday or Thursday of the same week.",
      question: "What should we do with your appointment?", options: ["Keep it on Tuesday", "Move it to Wednesday", "Move it to Thursday"]
    },
    {
      id: "s4", from: { name: "Henrik Dahl", address: "henrik@granite-books.example" }, subject: "Book club meeting",
      body: "Hi everyone, the next book club meeting is coming up and we need to pick a venue. The library has a quiet room free on Wednesday evening, while the cafe on the corner is cheaper but louder. I will book whichever place gets the most votes, so please reply when you have a moment.",
      question: "Where should we meet?", options: ["At the library", "At the cafe", "Either is fine"]
    },
    {
      id: "s5", from: { name: "Sofia Marin", address: "sofia@zenith-events.example" }, subject: "Catering for the workshop",
      body: "Good morning, we are finalising the catering order for the workshop and the kitchen needs the numbers by noon. Sandwiches, salads and a vegetarian pasta are all available, and each option comes with fruit and coffee. Please choose the main dish you would like us to reserve for you.",
      question: "Which main dish would you like?", options: ["Sandwiches", "A salad", "Vegetarian pasta"]
    },
    {
      id: "s6", from: { name: "Daniel Okoye", address: "daniel@riverbend-it.example" }, subject: "Software update tonight",
      body: "Hello, the IT team will install a security update on all laptops tonight and each machine needs to restart afterwards. The update takes around twenty minutes. You can choose to run it during the evening, or leave your laptop switched on overnight and let it finish before you arrive tomorrow morning.",
      question: "When should the update run?", options: ["This evening", "Overnight", "Next week instead"]
    },
    {
      id: "s7", from: { name: "Clara Weiss", address: "clara@maple-academy.example" }, subject: "Parent meeting time",
      body: "Dear parent, we are scheduling the spring meetings with teachers and have a few time slots left. There is one on Monday after school, another on Tuesday at lunchtime, and a last one on Thursday evening. Each meeting lasts fifteen minutes. Please tell us which time would be easiest for you.",
      question: "Which time suits you best?", options: ["Monday after school", "Tuesday at lunchtime", "Thursday evening"]
    },
    {
      id: "s8", from: { name: "Ravi Menon", address: "ravi@tidewater-gym.example" }, subject: "Membership renewal",
      body: "Hi, your gym membership is due for renewal at the end of this month. You can renew for one month, for six months at a lower monthly price, or for a full year with a free towel service included. Let me know which option you want and I will update your account today.",
      question: "Which plan would you like?", options: ["One month", "Six months", "One full year"]
    },
    {
      id: "s9", from: { name: "Ingrid Solberg", address: "ingrid@fjord-cafe.example" }, subject: "Office coffee order",
      body: "Hello, I am placing the monthly coffee order for the office and wanted to check what everyone prefers this time. We can order the usual dark roast, a lighter roast that several people asked about, or a decaf blend for the afternoon. I will place the order before the end of the day.",
      question: "Which coffee should we order?", options: ["The dark roast", "The lighter roast", "The decaf blend"]
    },
    {
      id: "s10", from: { name: "Mateo Ruiz", address: "mateo@sunrise-rentals.example" }, subject: "Car rental pickup",
      body: "Good afternoon, your rental car is ready for the trip next week. You can collect it at the airport branch when you land, or at our city office, which is closer to your hotel and open until eight in the evening. Please tell us where you would like to pick it up.",
      question: "Where will you collect the car?", options: ["At the airport", "At the city office", "Please call me first"]
    },
    {
      id: "s11", from: { name: "Hanna Virtanen", address: "hanna@aurora-labs.example" }, subject: "Team photo day",
      body: "Hi team, a photographer will visit the office to take new team portraits and group photos. There are sessions on both Wednesday and Friday, and each person needs only five minutes. Wear whatever you like. Please tell me which day you prefer so I can build a schedule and avoid long waits.",
      question: "Which day do you prefer?", options: ["Wednesday", "Friday", "Either day works"]
    },
    {
      id: "s12", from: { name: "Felix Brandt", address: "felix@cobalt-bank.example" }, subject: "Statement delivery",
      body: "Dear customer, we are updating how your account statements are delivered. You can keep receiving paper letters by post, switch to a secure online mailbox, or get a short email alert each month with a link to your statement. Please choose the option you would like us to set up.",
      question: "How should we send your statements?", options: ["By post", "In the online mailbox", "By email alert"]
    }
  ]
};
