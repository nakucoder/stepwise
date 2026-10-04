import { useNavigate } from 'react-router'
import { LevelPicker } from '../components/LevelPicker'

/** The welcome screen at /start (the logo links here): choose a level, then go to the topics. */
export function WelcomePage() {
  const navigate = useNavigate()
  return (
    <>
      <title>How do you want to learn? – Stepwise</title>
      <LevelPicker
        onChoose={() => {
          void navigate('/')
        }}
      />
    </>
  )
}
