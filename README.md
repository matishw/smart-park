# Smart Park

Parking Registration App

Build a simple, clean, mobile-friendly web application for registering parking spaces.

Goal

There are only six available parking spaces:

126

127

155

212

217

239

The application should allow a user to select the parking space where they parked. Once selected, that parking space becomes unavailable for everyone else until the daily reset.

Functional Requirements

1. Home Screen

Display the title:

"Available Parking Spaces"

Show only parking spaces that are currently available.

Each parking space should appear as a large clickable button or card.

Example:

126
127
212


If a parking space has already been selected by another user, it must NOT appear.

2. Selecting a Parking Space

When the user clicks a parking space:

Ask for confirmation:

"Are you sure you parked in space 126?"

If confirmed:

Save the parking space as occupied.

Remove it from the available list.

Show a success message:

Parking space successfully registered.


3. Persistent Storage

Use a JSON file as the database.

Example:

{
  "occupied": [
    126,
    217
  ]
}


Every user opening the application should read this JSON file and only see parking spaces that are not listed in occupied.

4. Daily Reset

Every day at 20:00 (8:00 PM) server local time:

Clear the JSON file.

All parking spaces become available again.

After reset:

{
  "occupied": []
}


5. Available Parking Calculation

The complete list is always:

126
127
155
212
217
239


Available spaces are calculated by removing every occupied space from this list.

6. Concurrency

If two users try to reserve the same parking space simultaneously:

Only the first request should succeed.

The second user should receive:

This parking space has already been taken.
Please choose another parking space.


The application must prevent race conditions.

7. API

Implement these endpoints.

GET /api/parking

Returns:

{
  "available": [126,127,212]
}


POST /api/parking

Request:

{
  "space": 126
}


Success:

{
  "success": true
}


Already occupied:

{
  "success": false,
  "message": "Parking space already occupied."
}


8. UI Requirements

Responsive design

Large buttons

Clean modern interface

Green color for available parking

Success notification after reservation

Confirmation dialog before saving

9. Technical Requirements

Use a JSON file for persistence (no SQL database).

Automatically create the JSON file if it does not exist.

Read/write the JSON safely.

Ensure writes are atomic to avoid corruption.

Validate all requests on the server.

Prevent duplicate reservations.

10. Optional Improvements

If possible, also add:

Auto-refresh every 10 seconds so users immediately see when spaces become unavailable.

A "Refresh" button.

Display:

Available: 4 / 6


at the top of the page.

Nice loading spinner while data is being fetched.

Final Result

The application should behave like a very small reservation system:

Every parking space can only be selected once.

All users share the same data.

The data is stored in a JSON file.

Every day at exactly 20:00 all reservations are automatically cleared.

The interface should be simple enough for non-technical users to use from their mobile phones.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/57360a9b-db9b-4bcd-9004-f7e4372472c9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
