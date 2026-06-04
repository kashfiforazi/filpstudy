import { Book } from '../types';

export const PRELOADED_BOOKS: Book[] = [
  {
    id: 'hsc-physics-2027',
    title: 'HSC 2027 Physics: Wave Dynamics & Electromagnetism',
    category: 'Physics',
    coverImage: 'linear-gradient(135deg, #13141F 0%, #171B30 100%)', // Will be rendered dynamically as a gorgeously styled Japanese cover
    pdfFile: 'mock-physics',
    isFeatured: true,
    order: 1,
    createdAt: 1717482376000
  },
  {
    id: 'hsc-math-ext1-2027',
    title: 'HSC 2027 Mathematics Extension 1: Calculus & Vectors',
    category: 'Mathematics',
    coverImage: 'linear-gradient(135deg, #FFF0F5 0%, #FFE4E1 100%)', // Sakura pink pastel cover
    pdfFile: 'mock-math',
    isFeatured: true,
    order: 2,
    createdAt: 1717482377000
  },
  {
    id: 'hsc-chem-2027',
    title: 'HSC 2027 Chemistry: Organic Structures & Equilibrium',
    category: 'Chemistry',
    coverImage: 'linear-gradient(135deg, #F0FFF0 0%, #E6F3E6 100%)', // Mint minimalist cover
    pdfFile: 'mock-chem',
    isFeatured: false,
    order: 3,
    createdAt: 1717482378000
  },
  {
    id: 'hsc-bio-2027',
    title: 'HSC 2027 Biology: Heredity & Disease Ecology',
    category: 'Biology',
    coverImage: 'linear-gradient(135deg, #FAF0E6 0%, #EFE5D9 100%)', // Linen paper canvas cover
    pdfFile: 'mock-bio',
    isFeatured: false,
    order: 4,
    createdAt: 1717482379000
  }
];

export interface TextbookPage {
  title: string;
  subTitle: string;
  chapter: string;
  paragraphs: string[];
  formulas?: string[];
  diagramType?: 'wave' | 'graph' | 'benzene' | 'dna' | 'grid';
  kanjiAesthetic?: string;
}

export const GET_MOCK_BOOK_PAGES = (bookId: string): TextbookPage[] => {
  switch (bookId) {
    case 'hsc-physics-2027':
      return [
        {
          chapter: '序章 / PREFACE',
          title: 'Wave Dynamics: HSC 2027 Syllabus',
          subTitle: 'An Introduction to Mechanical Wave propagation, superposition, and resonance.',
          paragraphs: [
            'In physics, a wave is an oscillation accompanied by a transfer of energy that travels through a medium. Understanding wave motion is fundamental to mechanics, acoustics, quantum mechanics, and electromagnetic radiation.',
            'Under the NESA HSC 2027 syllabus, students are expected to analyze mathematical models representing longitudinal and transverse waves, calculate intensities, and formulate superposition maps.',
            'For optimal study, use the highlighter tool (⌥H) to mark key definitions and the brush tool (⌥B) to sketch wavefront grids directly in the margen columns.'
          ],
          formulas: [
            'Wave Speed: v = f * λ',
            'Phase Difference: Δφ = (2π / λ) * Δx',
            'Intensity Relation: I ∝ A²'
          ],
          diagramType: 'wave',
          kanjiAesthetic: '波動'
        },
        {
          chapter: '第一章 / CHAPTER 1',
          title: '1.1 Superposition & Wave Interference',
          subTitle: 'Waves travel through one another without deformation, resulting in algebraic addition of displacements.',
          paragraphs: [
            'Principle of Superposition: When two or more waves of the same type cross at any point, the resultant displacement is equal to the vector sum of their individual displacements.',
            'Constructive interference occurs when crests align with crests, yielding maximum constructive displacement. Destructive interference occurs when crests align with troughs, causing total cancellation if the amplitudes are equal.',
            'HSC Exam Tip: Always state the phase difference in radians (e.g., π or 2π) when solving questions regarding path difference in interference patterns.'
          ],
          formulas: [
            'Constructive: Path Diff = n * λ',
            'Destructive: Path Diff = (n + 0.5) * λ',
            'Resultant Amplitude: A_total = √(A₁² + A₂² + 2A₁A₂cosφ)'
          ],
          diagramType: 'wave',
          kanjiAesthetic: '干渉'
        },
        {
          chapter: '第一章 / CHAPTER 1',
          title: '1.2 Standing Waves & Resonance',
          subTitle: 'Forming stationary wave structures with nodes and antinodes in hollow cavities.',
          paragraphs: [
            'When two waves of identical frequency and amplitude traveling in opposite directions meet in a medium, they establish a standing wave. Unlike progressive waves, standing waves do not transfer net energy.',
            'Nodes are positions of zero displacement, formed by continuous destructive interference. Antinodes are positions of maximum displacement, occurring where constructive interference takes place.',
            'Examine the resonant frequencies in strings clamped at both ends, and open versus closed cylinders.'
          ],
          formulas: [
            'String Harmonics: f_n = n * (v / 2L)',
            'Open Tube: f_n = n * (v / 2L)',
            'Closed Tube: f_n = (2n - 1) * (v / 4L)'
          ],
          diagramType: 'grid',
          kanjiAesthetic: '共鳴'
        },
        {
          chapter: '第二章 / CHAPTER 2',
          title: '2.1 Electrostatics and Field Forces',
          subTitle: 'Assessing Coulomb interactions and field vector distributions.',
          paragraphs: [
            'Electric charge is a fundamental property of matter. It experiences force inside an electric field. The NESA Syllabus demands rigorous computation of electric field lines around complex point configurations.',
            'We review path integral calculations of electrostatic potential and mechanical work needed to reposition charged nuclei in localized high-voltage accelerators.'
          ],
          formulas: [
            'Coulomb Force: F = k * (q₁q₂ / r²)',
            'Electric Field Strength: E = V / d = F / q',
            'Electrostatic Potential: V = k * (q / r)'
          ],
          diagramType: 'graph',
          kanjiAesthetic: '電磁'
        },
        {
          chapter: '第三章 / CHAPTER 3',
          title: '3.1 Syllabus Checklist & Practice Exam Guidelines',
          subTitle: 'Preparation strategies for the 2027 Higher School Certificate Examination.',
          paragraphs: [
            'As you conclude this wave dynamics module, verify your competencies against the following core learning indicators:',
            '1. Graph instantaneous particle displacement in functional intervals.',
            '2. Compare polarization behaviors between electromagnetic and sound-activated pressure waves.',
            '3. Formulate structural explanations for acoustic resonance in custom-shaped flutes.'
          ],
          formulas: [
            'Exam Target Score: 95% +',
            'Allocated Time: 3 Hours',
            'Critical Areas: Electromagnetism, Quantum Mechanics'
          ],
          diagramType: 'grid',
          kanjiAesthetic: '試験'
        }
      ];

    case 'hsc-math-ext1-2027':
      return [
        {
          chapter: '序章 / PREFACE',
          title: 'Mathematics Extension 1: Syllabus Core',
          subTitle: 'Rigorous tools in calculus, proof-building, and vector manipulation.',
          paragraphs: [
            'The NESA Mathematics Extension 1 course builds upon 2-Unit foundations. It challenges students to derive complex trigonometric proofs, compute vectors in three dimensions, and master mathematical induction.',
            'Tokyo tech minimalism focuses on step-by-step clarity. When studying mathematical proofs, draw margin sketches to capture geometric vectors or volume rotations.'
          ],
          formulas: [
            'Trigonometric Sum: sin(A + B) = sinA cosB + cosA sinB',
            'Derivative Product Rule: d/dx(uv) = u\'v + uv\'',
            'Vector Modulus: |v| = √(x² + y² + z²)'
          ],
          diagramType: 'graph',
          kanjiAesthetic: '数理'
        },
        {
          chapter: '第一章 / CHAPTER 1',
          title: '1.1 Differential Calculus in 3D Motion',
          subTitle: 'Modeling velocity and acceleration arrays in parametric curves.',
          paragraphs: [
            'Parametric equations express x, y, and z coordinates as independent functions of a main parameter—usually time (t). By looking at coordinate derivatives, we can track vector trajectories in free-space fields.',
            'We apply calculus of trigonometric vectors to model orbital mechanics of low-altitude weather trackers.'
          ],
          formulas: [
            'Position: r(t) = x(t)i + y(t)j + z(t)k',
            'Velocity Vector: v(t) = dx/dt i + dy/dt j + dz/dt k',
            'Speed Scalar: s = √((dx/dt)² + (dy/dt)² + (dz/dt)²)'
          ],
          diagramType: 'graph',
          kanjiAesthetic: '導関'
        },
        {
          chapter: '第二章 / CHAPTER 2',
          title: '2.1 Vector Geometry in R³ Space',
          subTitle: 'Investigating coordinate projections and perpendicular intersections.',
          paragraphs: [
            'Vector geometry maps points in three-dimensional coordinates. In NESA 2027, vector dot products are used to verify spatial perpendicularity and solve three-dimensional physics tasks.',
            'We define projection vectors where u is projected onto v, yielding an independent scalar multiplier alongside the target unit vector.'
          ],
          formulas: [
            'Dot Product: a · b = a₁b₁ + a₂b₂ + a₃b₃ = |a||b|cosθ',
            'Projection of u onto v: proj_v(u) = ((u · v) / |v|²) * v',
            'Orthogonality Check: a · b = 0'
          ],
          diagramType: 'wave',
          kanjiAesthetic: '幾何'
        },
        {
          chapter: '第三章 / CHAPTER 3',
          title: '3.1 Calculus of Logarithmic Functions',
          subTitle: 'Evaluating non-trivial integrals via u-substitution pathways.',
          paragraphs: [
            'Integration of logarithmic functions is a staple Extension 1 exam syllabus capability. Students should memorize derivatives of logarithmic functions with arbitrary bases.',
            'Remember: when integrating reciprocal functions, always include the absolute value brackets within log variables.'
          ],
          formulas: [
            'Integration: ∫ (1 / x) dx = ln|x| + C',
            'Arbitrary Base: d/dx (log_a(x)) = 1 / (x * ln(a))',
            'Derivative of e^u: d/dx (e^(f(x))) = f\'(x)e^(f(x))'
          ],
          diagramType: 'grid',
          kanjiAesthetic: '積分'
        }
      ];

    case 'hsc-chem-2027':
      return [
        {
          chapter: '序章 / PREFACE',
          title: 'Organic Chemistry Structures',
          subTitle: 'Carbon chains, functional naming systems, and aromatic configurations.',
          paragraphs: [
            'Organic chemistry investigates carbons and hydrogen-bonded arrays. We focus on structural isomers, esterification chemical pathways, and spectroscopic checks of newly synthesized fuels.',
            'Keep your canvas grid active when sketching organic bonds to capture clear single-and-double bond patterns.'
          ],
          formulas: [
            'Alkane Series: C_n H_{2n+2}',
            'Alkene Series: C_n H_{2n}',
            'Alkyne Series: C_n H_{2n-2}'
          ],
          diagramType: 'benzene',
          kanjiAesthetic: '有機'
        },
        {
          chapter: '第一章 / CHAPTER 1',
          title: '1.1 Aromatic Rings and Resonance Bonds',
          subTitle: 'Interrogating benzene rings and functional compound reactions.',
          paragraphs: [
            'Benzene (C₆H₆) exhibits unique stability due to delocalized pi-electrons floating within the six-carbon ring. This resonance means benzene does not readily undergo addition reactions, prioritizing substitution instead.',
            'Analyze substitution pathways using sulfuric acid and nitric acid to form nitrobenzene molecules.'
          ],
          formulas: [
            'Resonance Energy: 152 kJ / mol',
            'Electrophilic Catalysis: FeBr₃ + Br₂',
            'Density Metric: 0.878 g/cm³'
          ],
          diagramType: 'benzene',
          kanjiAesthetic: '六環'
        }
      ];

    case 'hsc-bio-2027':
    default:
      return [
        {
          chapter: '序章 / PREFACE',
          title: 'HSC Biology: Heredity & Modern Ecology',
          subTitle: 'Examining genetic translation pathways and DNA transcription loops.',
          paragraphs: [
            'This curriculum checks cellular processes, pedigree charts, and biotechnologies that alter genetic lines. Focus on structural mutations in nucleotide bases.',
            'Use custom sticky notes to color-code dominant and recessive phenotypes on study pages.'
          ],
          formulas: [
            'Hardy-Weinberg: p² + 2pq + q² = 1',
            'Transcription Rate: ~20 nucleotides/sec',
            'Mitosis Stages: Interphase -> Prophase -> Metaphase'
          ],
          diagramType: 'dna',
          kanjiAesthetic: '生命'
        },
        {
          chapter: '第一章 / CHAPTER 1',
          title: '1.1 Advanced DNA Mapping and CRISPR Tech',
          subTitle: 'Manipulating genomes using enzyme cutters and structural insertions.',
          paragraphs: [
            'CRISPR Cas9 represents a monumental leap in bio-engineering. Guided by custom RNA strings, Cas9 recognizes specific nucleotide matrices to perform surgical double-strand slices.',
            'Under NESA guidelines, students are assessed on bioethical outcomes and vector vectors for delivering edited strands.'
          ],
          formulas: [
            'Cas9 Cut Sequence: PAM (5\'-NGG-3\')',
            'RNA Guide Length: ~20 Nucleotides',
            'Efficiency Score: ~80% - 90%'
          ],
          diagramType: 'dna',
          kanjiAesthetic: '遺伝'
        }
      ];
  }
};
