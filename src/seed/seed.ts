import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

const workPackages = [
  {
    number: 1,
    name: 'Engineered Hardwood Flooring (Main + Upper Levels)',
    description:
      'Remove existing flooring on main level and upper level. Upper level: repair/replace subfloor and fix squeaks before new floor goes down. Install new engineered hardwood throughout both levels. Scope includes all rooms, hallways, closets on main and upper levels.',
    status: 'not_started',
    budget_allocated: 15000,
  },
  {
    number: 2,
    name: 'Interior Painting (Main + Upper Levels)',
    description:
      'All walls, ceilings, trim, baseboards, door casements, and window casements. Main and upper levels (not lower level). Includes prep work (patching, sanding, priming).',
    status: 'not_started',
    budget_allocated: 8000,
  },
  {
    number: 3,
    name: 'Tile Flooring at Entries',
    description:
      'New tile floors at front entry/vestibule. New tile floors at rear entry (mudroom area off kitchen). Includes removal of existing flooring and any subfloor prep.',
    status: 'not_started',
    budget_allocated: 4000,
  },
  {
    number: 4,
    name: 'Kitchen Cabinets + Mudroom Built-Ins',
    description:
      'All new kitchen cabinetry (full replacement). Built-in wardrobe and bench in the mudroom/tandem room at back of house off kitchen. Cabinet hardware selection. Includes demolition of existing cabinets.',
    status: 'not_started',
    budget_allocated: 25000,
  },
  {
    number: 5,
    name: 'Kitchen Counters, Backsplash & Lighting',
    description:
      'New countertops (material TBD — quartz, granite, butcher block, etc.). New backsplash (tile, stone, or other). Under-cabinet lighting installation. Includes templating, fabrication, and install.',
    status: 'not_started',
    budget_allocated: 10000,
  },
  {
    number: 6,
    name: 'Staircase Refinishing',
    description:
      'Refinish stair treads and risers (main staircase between main and upper levels). Refinish or replace railings and balusters. May include stripping existing finish, sanding, staining, and sealing.',
    status: 'not_started',
    budget_allocated: 5000,
  },
  {
    number: 7,
    name: 'Kitchen Appliances',
    description:
      'All new kitchen appliances (range/cooktop, oven, refrigerator, dishwasher, range hood, microwave — exact list TBD). Research, selection, and purchase tracking. Delivery scheduling and coordination with kitchen cabinet install timeline.',
    status: 'not_started',
    budget_allocated: 12000,
  },
]

async function seed() {
  console.log('Seeding RenoVision database...')

  // Check if work packages already exist
  const { data: existing } = await supabase
    .from('work_packages')
    .select('id')
    .limit(1)

  if (existing && existing.length > 0) {
    console.log('Work packages already seeded. Skipping.')
    return
  }

  // Insert work packages
  const { data: wps, error: wpError } = await supabase
    .from('work_packages')
    .insert(workPackages)
    .select()

  if (wpError) {
    console.error('Error seeding work packages:', wpError)
    return
  }

  console.log(`Inserted ${wps.length} work packages`)

  // Create initial schedule tasks with dependencies
  const wpMap: Record<number, string> = {}
  for (const wp of wps) {
    wpMap[wp.number] = wp.id
  }

  const scheduleTasks = [
    {
      work_package_id: wpMap[4],
      name: 'Kitchen cabinet demolition',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: false,
      notes: 'Must complete before flooring in kitchen area',
    },
    {
      work_package_id: wpMap[4],
      name: 'Kitchen cabinet installation',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: false,
      notes: 'After demo, before counters',
    },
    {
      work_package_id: wpMap[4],
      name: 'Mudroom built-ins installation',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: false,
      notes: 'Can run parallel to kitchen cabinet install',
    },
    {
      work_package_id: wpMap[4],
      name: 'Cabinets delivered',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: true,
      notes: 'Key milestone — confirm lead time with supplier',
    },
    {
      work_package_id: wpMap[5],
      name: 'Counter templating',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: false,
      notes: 'After cabinets installed',
    },
    {
      work_package_id: wpMap[5],
      name: 'Counter fabrication & install',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: false,
      notes: 'After templating, typically 2-3 week lead time',
    },
    {
      work_package_id: wpMap[5],
      name: 'Backsplash installation',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: false,
      notes: 'After counters installed',
    },
    {
      work_package_id: wpMap[5],
      name: 'Under-cabinet lighting',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: false,
      notes: 'Coordinate with cabinet and counter install',
    },
    {
      work_package_id: wpMap[1],
      name: 'Subfloor repair (upper level)',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: false,
      notes: 'Fix squeaks before hardwood goes down',
    },
    {
      work_package_id: wpMap[1],
      name: 'Hardwood flooring installation',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: false,
      notes: 'After kitchen demo, coordinate with staircase refinishing',
    },
    {
      work_package_id: wpMap[2],
      name: 'Interior painting — prep',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: false,
      notes: 'Patching, sanding, priming. After flooring ideally.',
    },
    {
      work_package_id: wpMap[2],
      name: 'Interior painting — finish coats',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: false,
      notes: 'Main and upper levels',
    },
    {
      work_package_id: wpMap[3],
      name: 'Entry tile installation',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: false,
      notes: 'Front and rear entries. Can run in parallel with most work.',
    },
    {
      work_package_id: wpMap[6],
      name: 'Staircase refinishing',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: false,
      notes: 'Coordinate with flooring for finish consistency',
    },
    {
      work_package_id: wpMap[7],
      name: 'Appliance selection & ordering',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: false,
      notes: 'Order early for delivery lead times',
    },
    {
      work_package_id: wpMap[7],
      name: 'Appliance delivery & installation',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: false,
      notes: 'After cabinets and counters installed',
    },
    {
      work_package_id: null,
      name: 'Final walkthrough',
      start_date: null,
      end_date: null,
      status: 'scheduled',
      is_milestone: true,
      notes: 'Complete project review',
    },
  ]

  const { data: tasks, error: taskError } = await supabase
    .from('schedule_tasks')
    .insert(scheduleTasks)
    .select()

  if (taskError) {
    console.error('Error seeding schedule tasks:', taskError)
  } else {
    console.log(`Inserted ${tasks.length} schedule tasks`)
  }

  // Create a default chat session
  const { error: chatError } = await supabase.from('chat_sessions').insert({
    title: 'Design Consultation — Getting Started',
  })

  if (chatError) {
    console.error('Error creating chat session:', chatError)
  } else {
    console.log('Created initial chat session')
  }

  console.log('Seed complete!')
}

seed().catch(console.error)
