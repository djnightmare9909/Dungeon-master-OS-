go to logbook settings version 3 to switch to new update

youtube tutorial: https://youtu.be/2TAoK5txIts


YouTube video overview: https://youtu.be/f0dCEIK2l0Q
---

DM OS: The Living World Engine

An advanced, AI‑powered Dungeon Master for immersive, long‑form Dungeons & Dragons campaigns, powered by Google Gemini.

DM OS is not just a chatbot; it is a sophisticated simulation engine designed to create a persistent, reactive, and deeply engaging role‑playing experience. It combines a state‑of‑the‑art AI with a rich user interface to deliver a D&D campaign where your choices have lasting, meaningful consequences.

---

🚀 Getting Started – Choose Your Path

DM OS can be run in multiple ways. Pick the one that best fits your comfort level and setup.

Option 1: Instant Play (No Installation)

If you just want to jump into a game without installing anything, use one of these one‑click options:

· Google AI Studio Environment
    Click the link in the Releases section labeled AI Studio Environment. It opens AI Studio with the entire app running inside its virtual machine – no setup required. (You'll need a free Google account.)
· Gemini App (Custom Gem)
    Also in the Releases section is the link to my custom Gem for Gemini. If you already have a Gemini account, you can start playing immediately – the prompt is pre‑loaded.
· Drag‑and‑Drop Text File
    Download the DM-OS-kernel-v3.0.txt file from the Releases page. Then drag and drop it into any AI chat interface (like ChatGPT, Claude, Gemini, etc.) that supports long prompts. The AI will instantly become your Dungeon Master – no code, no terminals.

Option 2: Local Installation (For Linux / Node.js)

If you prefer to run the full web app on your own machine, follow the steps below.

Prerequisites

· Node.js (modern version, e.g. 18 or later)
· npm (comes with Node.js)
· A Google Gemini API key (get one free from Google AI Studio)

Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/djnightmare9909/Dungeon-master-OS-
cd Dungeon-master-OS-

# 2. Install dependencies
npm install

# 3. Create an environment file with your API key
nano .env.local
# Add this line (replace with your actual key):
# GEMINI_API_KEY="your_api_key_here"

# 4. Launch the app
npm run dev
```

Once the server is running, open http://localhost:3000 in your browser.

---

✨ Core Features

1. The Living World Engine

At the heart of DM OS is a silent, internal process called The Chronicler. This world engine operates in the background, simulating the actions of factions, the schemes of villains, and the ripple effects of your deeds even when you're not looking.

· Progress Clocks: Long‑term events (like an invasion or a spreading plague) are tracked on timers. Your actions – or inactions – can advance or halt these clocks, dynamically shaping the world's future.
· Reactive Environments: The world remembers. A goblin patrol you eliminate won't just disappear; their war camp will be on high alert when you arrive. News of your deeds, good or ill, will spread, changing how different communities react to you.

2. Deeply Simulated NPCs with Persistent Memory

NPCs in DM OS are more than just quest‑givers; they are simulated people with unique histories, beliefs, and memories.

· Narrative DNA: Every significant NPC is generated with a "Cornerstone Event" from their past that has shaped their worldview, created behavioral scars, and defined their core motivations.
· Stateful Interaction Log: NPCs remember every significant interaction they have with you. Earning an NPC's trust or making a lifelong enemy has tangible, long‑term consequences that will shape your story. Their disposition evolves based on your actions, not a predefined script.

3. Unprecedented Player Agency: The OOC Protocol

The Out‑of‑Character (OOC) protocol is your ultimate tool for co‑directing the game. It allows you to speak directly to the underlying AI, temporarily bypassing the Dungeon Master persona to manually change any aspect of the game world, plot, or characters.

· Authenticated Control: Using a session‑specific password, you can issue direct commands to:
  · Spawn NPCs and items
  · Change the weather or environment
  · Retroactively alter plot points ("retconning")
  · Manually guide the story in a new direction

4. Multiple, Distinct DM Personas

Tailor your D&D experience by choosing from one of four distinct Dungeon Master personalities at the start of your campaign:

· The Purist (Tactician): A traditional, rules‑as‑written referee for a challenging, tactical experience.
· The Narrativist (Storyweaver): Focuses on collaborative storytelling, character arcs, and the "Rule of Cool."
· The Romantic Storyteller (Bard): For mature stories focusing on deep relationships, passion, and intimacy.
· The Hack & Slash (Gladiator): A fast‑paced, action‑oriented game focused on combat and loot.

5. Comprehensive & Automated Logbook

Your adventure is automatically chronicled in a detailed in‑game logbook, which you can ask the DM to update at any time. It includes:

· Character Sheet: A complete, auto‑generated D&D 5e character sheet.
· Inventory & Quest Journal: Concise summaries of your current inventory and quests.
· Dramatis Personae (NPCs): A list of characters you've met, including their description and current relationship to you.
· Achievements: A unique list of achievements generated based on your specific actions and accomplishments.

6. Advanced AI‑Powered Tools

Leverage the power of generative AI to enrich your experience:

· Character Portrait Generation: Create a unique, high‑quality portrait of your character based on their in‑game description and equipment using Imagen.
· Text‑to‑Speech (TTS): Have the Dungeon Master's narration and dialogue read aloud for a more immersive experience.
· On‑Demand Summaries: Instantly get updated summaries for your inventory, quests, and more without breaking the flow of the game.
· Multimodal RAG Context: Upload documents (including PDFs), images, audio, or video files. The AI will extract the relevant information and add it to its working context, allowing you to ground your adventure in your own custom content.

7. Rich, Customizable User Interface

DM OS features a polished and highly customizable interface designed for role‑playing.

· 20+ UI Themes: Personalize the look and feel of the app with themes ranging from High Fantasy and Sci‑Fi to Cyberpunk and Pirate.
· Integrated Dice Pouch: A fully‑featured dice roller is always available for manual rolls.
· Quick Actions & Inventory: A quick‑access inventory popup and command buttons streamline gameplay, letting you focus on the story.

---

🛠️ Technical Architecture

· Core AI: Powered by Google's Gemini 2.5 Flash, providing fast, creative, and context‑aware responses. Its multimodal capabilities allow it to process and understand text, images, audio, and video.
· Reasoning Engine: The DM's advanced long‑term memory and self‑correction capabilities are managed by the WFGY Universal Unification Framework, which uses a "Semantic Tree" to ensure perfect campaign continuity over hundreds of turns.
· Data Persistence: All game data, including chat history, settings, and context, is stored locally and privately in your browser using IndexedDB.
· Data Management: Full support for exporting and importing single adventures or your entire campaign history in JSON format.

---

📜 Philosophy & Origins

DM OS was born from a simple belief: that a truly immersive, long‑form AI Dungeon Master should be accessible to everyone. It is the result of a nine‑month independent research and development journey to create a prompt architecture sophisticated enough to unlock the full storytelling potential of Google's Gemini models.

This project is not just an application; it's a testament to a new kind of creative partnership between human and machine – a process that could be called "vibe coding."

· The Human Element (The Architect): The soul of the DM – its personality, its rules, its intricate memory protocols, and its ability to weave a coherent, long‑term narrative – was meticulously crafted from the ground up by a single, independent creator. This instructional core, tailored specifically for Gemini, is the result of countless hours of experimentation and refinement. In the spirit of its origins as a custom "copypasta" for advanced users, this core prompt remains accessible within the application's source code (and as a standalone text file in the Releases).
· The AI Element (The Builder): Once the core intelligence was designed, an AI partner was tasked with constructing its physical form. The entire front‑end application you see – the user interface, the interactive components, the thematic styling – was written by an AI through Google's AI Studio, translating the creator's vision into functional, polished code.

The Breakthrough: A Shared Mountain

A core challenge for any AI DM is memory. Early in development, the creator was deep into the process of building a complex, custom RAG system to solve this. In a moment of open‑source serendipity, this path converged with the work of onestardao, the creator of the WFGY Universal Unification Framework. Seeing that the DM OS creator was already "halfway up the monolithic research mountain," they generously shared their research and code.

This collaboration was the final, critical piece. By integrating the proven WFGY memory system with the custom‑built Gemini prompt core, DM OS achieved a level of state management that is nearly guaranteed to be persistent. This AI doesn't forget. When leveraged with the OOC protocol, players have an unprecedented ability to maintain a coherent and evolving world state.

A Call to Adventure

DM OS has been battle‑tested extensively by its creator and is considered a rock‑solid platform for epic campaigns. However, its true test begins with you. As an independent project, it thrives on community engagement. We invite you to begin your adventure, push the boundaries of the simulation, and discover the stories waiting to be told.

---

🔧 Troubleshooting (Local Installation)

1. API Key Issues (undefined Errors)
   · Vite only exposes environment variables prefixed with VITE_.
   · Ensure your .env.local file is in the project root.
   · Restart the dev server after changing the file.
2. Permissions Errors (EACCES)
   · Avoid sudo npm install. Use a Node version manager like nvm instead.
   · Alternatively, fix ownership: sudo chown -R $(whoami) .
3. Server or Connection Failures
   · If the server stalls, increase file descriptor limits: ulimit -Sn 10000
   · Make sure port 3000 is free.
4. Dependency Issues
   · Delete node_modules and package-lock.json, then run npm install again.
   · Verify Node.js version (node -v) is modern (v18+).

---

Enjoy your adventure! If you have questions or feedback, open an issue or join the discussion on GitHub.
