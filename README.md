# Daily Work Tracker 🚀

A comprehensive local web application designed for Team Leaders (TLs) and team members to effectively track daily work progress with visual roadmaps, intelligent checklists, smart todo management, meeting tracking, and automated journal generation.

## 🌟 Overview

Daily Work Tracker is a **privacy-first**, **offline-capable** productivity application that runs entirely in your browser. No data is sent to external servers - everything stays on your device for complete privacy and security.

### ✨ Key Features

- **🛣️ Visual Project Roadmap** - Interactive canvas with car animation showing project progress
- **✅ Smart Daily Checklist** - Template-based checklist with automatic daily reset
- **📝 Advanced Todo Management** - Priority-based todos with carryforward logic
- **🤝 Meeting Tracker** - Comprehensive meeting management with rich note-taking
- **📊 Analytics Dashboard** - Detailed insights and productivity metrics
- **💾 Local Data Storage** - All data stored securely in your browser
- **🌙 Responsive Design** - Works perfectly on desktop, tablet, and mobile

---

## 🎯 When to Use Daily Work Tracker

### Perfect For:

- **Team Leaders (TLs)** managing project timelines and team coordination
- **Project Managers** tracking milestones and deliverables
- **Individual Contributors** organizing daily tasks and long-term goals
- **Remote Workers** needing structured daily organization
- **Agile Teams** managing sprints and daily standups
- **Consultants** tracking client projects and meetings
- **Students** managing coursework and project deadlines

### Ideal Scenarios:

- **Daily Planning:** Start each day by reviewing your roadmap and checklist
- **Weekly Reviews:** Export journal entries for status reporting
- **Project Management:** Track progress from start to finish with visual indicators
- **Meeting Management:** Capture detailed notes with professional templates
- **Task Prioritization:** Organize todos by priority and category
- **Progress Reporting:** Generate comprehensive daily/weekly journals

---

## 🚀 How to Use

### Getting Started

1. **Open the Application**
   - Simply open `index.html` in Chrome 86+ or Edge 86+
   - No installation required - works directly in your browser

2. **First-Time Setup**
   - Click "Configure Project" to set up your roadmap
   - Add project name, start date, and end date
   - The system will automatically show your current progress

### 🛣️ Project Roadmap

**Purpose:** Visualize your project timeline with an animated progress indicator

**How to Use:**
- **Configure Project:** Set project details, dates, and description
- **Add Milestones:** Click on the roadmap or use "Add Milestone" button
- **Track Progress:** Watch the car animation move as time progresses
- **Visual Status:** See color-coded milestones (completed, upcoming, overdue)

<img width="1046" height="432" alt="image" src="https://github.com/user-attachments/assets/5bec05bd-71ec-4d6d-93a6-19f8e496ce03" />
<img width="480" height="630" alt="image" src="https://github.com/user-attachments/assets/c0b1a2d9-ed55-477b-9ffb-420a7b76ef57" />

**Best Practices:**
- Set realistic project timelines
- Add major milestones at key project phases
- Update milestone status regularly
- Use milestone descriptions for important details

### ✅ Daily Checklist

**Purpose:** Maintain consistent daily routines with template-based checklists

**How to Use:**
- **Templates Available:** Work, Health, Productivity, Custom
- **Daily Reset:** Automatically resets at midnight (configurable)
- **Progress Tracking:** Real-time completion percentage
- **Custom Items:** Add personal checklist items

**Best Practices:**
- Choose templates that match your role
- Add 5-10 items for optimal completion
- Check items throughout the day
- Review completion analytics weekly

<img width="1096" height="431" alt="image" src="https://github.com/user-attachments/assets/7d37d748-b6a4-4300-a809-069cc6fb829d" />


### 📝 Todo Management

**Purpose:** Advanced task management with priority and carryforward logic

**How to Use:**
- **Add Todos:** Include title, description, priority, and due date
- **Categorize:** Use categories (Work, Personal, Urgent, Project, Meeting)
- **Filter & Search:** Advanced filtering by status, priority, category
- **Carryforward:** Incomplete todos automatically carry to next day

**Priority System:**
- 🔴 **High Priority:** Urgent items requiring immediate attention
- 🟡 **Medium Priority:** Important items with flexible timing
- 🟢 **Low Priority:** Nice-to-have items when time permits

**Advanced Features:**
- **Bulk Actions:** Complete, delete, or modify multiple todos
- **Analytics:** Detailed completion statistics and trends
- **Search:** Find todos by text, category, or date
- **Export/Import:** Backup and restore todo data

<img width="1116" height="687" alt="image" src="https://github.com/user-attachments/assets/7a68b7d8-5d9f-4547-b21b-955be70dcb96" />

### 🤝 Meeting Management

**Purpose:** Comprehensive meeting tracking with professional note-taking

**How to Use:**
- **Schedule Meetings:** Add title, date, time, and attendees
- **Rich Notes:** Use templates for agendas, minutes, action items
- **Status Tracking:** Automatic status updates (upcoming, in-progress, overdue)
- **Export Notes:** Download meeting notes as formatted text

**Meeting Templates:**
- 📋 **Agenda Template** - Pre-meeting planning
- 📄 **Minutes Template** - Formal meeting documentation
- ✅ **Action Items Template** - Task tracking with owners
- 🎯 **Decisions Template** - Decision documentation

**Note-Taking Features:**
- Rich text formatting with bullets, numbers, checkboxes
- Live preview mode
- Auto-save functionality
- Character and word counting

<img width="1147" height="716" alt="image" src="https://github.com/user-attachments/assets/3614ad11-f60d-40be-aa17-08c26b036ce6" />

### 📊 Analytics & Insights

**Purpose:** Track productivity patterns and identify improvement opportunities

**Available Analytics:**
- **Checklist Analytics:** Completion rates, streaks, trends
- **Todo Analytics:** Category performance, priority distribution
- **Meeting Analytics:** Frequency, duration, completion rates
- **Overall Insights:** Productivity recommendations

---

### Exporting Journal
- Day to day (Current date) works can be exported as journal
- Live preview mode
- Can export as .txt or .html
- It helps to do not missout details in journal.
- Improve journal readability and tracking.  

<img width="591" height="775" alt="image" src="https://github.com/user-attachments/assets/75bfc65f-28c3-467d-a542-d49378c2f048" />


## ⌨️ Keyboard Shortcuts

### Global Shortcuts
- **Ctrl/Cmd + 1** - Navigate to Roadmap
- **Ctrl/Cmd + 2** - Navigate to Daily Checklist
- **Ctrl/Cmd + 3** - Navigate to Todos
- **Ctrl/Cmd + 4** - Navigate to Meetings
- **Ctrl/Cmd + J** - Export Journal
- **Escape** - Close any open modal

### Todo Management [Upcoming]
- **Ctrl/Cmd + N** - Add new todo (when in todos section)
- **Ctrl/Cmd + F** - Open advanced search
- **Ctrl/Cmd + B** - Open bulk actions

### Meeting Notes [Upcoming]
- **Ctrl/Cmd + S** - Save notes
- **Ctrl/Cmd + B** - Insert bullet point
- **Ctrl/Cmd + L** - Insert numbered list
- **Ctrl/Cmd + T** - Insert checkbox

---

## 🛠️ Technical Requirements

### Browser Compatibility
- **Chrome 86+** (Recommended)
- **Microsoft Edge 86+** (Recommended)
- **Modern browsers** with ES6+ support

### Required APIs
- LocalStorage (for settings and lightweight data)
- IndexedDB (for structured data storage)
- Canvas API (for roadmap visualization)
- File System Access API (for journal export)

### No Installation Required
- Pure web application
- No server setup needed
- No internet connection required after initial load

---

## 💾 Data Storage & Privacy

### Privacy First
- **100% Local Storage** - Data never leaves your device
- **No Tracking** - No analytics or user tracking
- **No Account Required** - No sign-up or login needed
- **Offline Capable** - Works without internet connection

### Storage Locations
- **Settings & Configuration:** Browser LocalStorage
- **Application Data:** Browser IndexedDB
- **Typical Size:** 1-5MB for active use

### Data Management
- **Auto Cleanup:** Old completed items removed after 30-60 days
- **Export/Import:** Full data backup and restore functionality
- **Clear Data:** Complete data removal option in settings

---

## 📱 Device Compatibility

### Desktop (Optimal Experience)
- **Windows:** Chrome, Edge
- **macOS:** Chrome, Safari (limited), Edge
- **Linux:** Chrome, Firefox (limited)

### Mobile & Tablet (Responsive)
- **iOS:** Chrome, Safari (limited features)
- **Android:** Chrome (recommended)
- **Tablets:** Full functionality with touch interface

---

## 🔧 Configuration Options

### Settings Panel (⚙️ Settings)
- **Theme:** Light, Dark, Auto (system preference)
- **Daily Reset Time:** Customize when checklist resets
- **Notifications:** Browser notifications for completed tasks
- **Data Retention:** How long to keep completed items
- **Debug Mode:** Enable console logging for troubleshooting

### Project Configuration
- **Project Name:** Your project or sprint name
- **Start Date:** Project beginning date
- **End Date:** Project completion target
- **Status:** Planning, Active, On Hold, Completed
- **Description:** Project details and context

---

## 🎨 UI/UX Features

### Modern Design
- **Clean Interface** - Minimalist, distraction-free design
- **Smooth Animations** - Polished micro-interactions
- **Visual Feedback** - Clear status indicators and progress bars
- **Consistent Colors** - Purple/violet theme with status-based colors

### Accessibility
- **Keyboard Navigation** - Full keyboard support
- **Screen Reader Friendly** - Semantic HTML structure
- **High Contrast** - Clear visual distinctions
- **Touch Friendly** - Large tap targets on mobile

---

## 📋 Best Practices

### Daily Workflow
1. **Morning:** Review roadmap, check daily checklist, prioritize todos
2. **Throughout Day:** Update completion status, add meeting notes
3. **Evening:** Review progress, plan tomorrow's priorities
4. **Weekly:** Export journal, analyze productivity trends

### Data Management
- **Regular Exports:** Backup data weekly
- **Clean Organization:** Use categories and priorities consistently
- **Meeting Notes:** Document decisions and action items
- **Review Analytics:** Check productivity patterns monthly

### Team Usage
- **Standardize Categories** - Use consistent todo categories across team
- **Meeting Templates** - Adopt standard meeting note templates
- **Regular Reviews** - Export and share weekly progress journals
- **Milestone Alignment** - Coordinate project milestones with team calendar

---

## 🆘 Troubleshooting

### Common Issues

**"Failed to Initialize" Error:**
- Ensure you're using Chrome 86+ or Edge 86+
- Check if browser storage is enabled
- Try clearing browser cache and reloading

**Data Not Saving:**
- Check available storage space
- Ensure cookies/storage is enabled for the site
- Try exporting data before clearing browser data

**Roadmap Not Loading:**
- Verify Canvas API support in browser
- Check if hardware acceleration is enabled
- Try refreshing the page

**Performance Issues:**
- Clear old completed items in settings
- Export and reimport data to optimize storage
- Close unnecessary browser tabs

### Getting Help
- Check browser developer console for error messages
- Export data before troubleshooting
- Try using a different supported browser

---

## 🔄 Version Information

**Current Version:** 1.0.0
**Release Date:** September 2025
**Compatibility:** Chrome 86+, Edge 86+

### Recent Updates
- ✅ Complete Phase 1-5 implementation
- ✅ Advanced meeting notes with rich text
- ✅ Todo carryforward and analytics
- ✅ Enhanced daily reset mechanism
- ✅ Comprehensive data persistence

---

## 📄 License

This project is provided as-is for productivity and organizational use. All data remains on your local device.

---

**Happy Tracking! 🎯**

*Built for productivity enthusiasts who value privacy, offline capability, and comprehensive task management.*
