import './styles/base.css';
import './styles/layout.css';
import './styles/section.css';
import './styles/home.css';
import './styles/glyphs.css';
import './styles/world.css';
import './styles/brand.css';
import './styles/study.css';
import './styles/exam.css';
import './styles/practice.css';
import './styles/infographic.css';
import './styles/decor.css';
import './styles/intro.css';
import './styles/responsive.css';
import { iniciarApp } from './app/app.ts';
import { temaActivo } from './content/temas/index.ts';

iniciarApp(temaActivo);
