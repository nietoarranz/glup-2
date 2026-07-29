import { ChevronRightIcon, CircleHelpIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import fountainIcon from '../assets/fountain-icon.svg?raw'
import glupLogo from '../assets/glup-logo.svg?raw'
import toiletIcon from '../assets/toilet-icon.svg?raw'
import type { AmenityKind } from '../lib/nearbyPlaces'

const defaultInstallPlatform =
  typeof navigator !== 'undefined' &&
  /iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? 'ios'
    : 'android'

type HomeProps = {
  onSelect: (kind: AmenityKind) => void
}

const options = [
  {
    kind: 'toilets' as const,
    title: 'Toilets',
    description: 'Public toilets near your location to glup out',
    icon: toiletIcon,
  },
  {
    kind: 'fountains' as const,
    title: 'Fountains',
    description: 'Public fountains near your location to glup in',
    icon: fountainIcon,
  },
]

export default function Home({ onSelect }: HomeProps) {
  return (
    <div className="home bg-neutral-100">
      <div className="home-brand">
        <div
          className="home-brand-inner"
          aria-label="glup"
          dangerouslySetInnerHTML={{ __html: glupLogo }}
        />
      </div>

      <div className="home-content">
        <h1 className="home-title">
          What do you
          <br />
          need?
        </h1>

        <ItemGroup>
          {options.map((option) => (
            <Item
              key={option.kind}
              asChild
              variant="outline"
              className="cursor-pointer bg-white transition-all hover:bg-neutral-50 active:translate-y-px"
            >
              <button type="button" onClick={() => onSelect(option.kind)}>
                <ItemMedia
                  className="size-10 text-primary [&_svg]:size-full"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: option.icon }}
                />
                <ItemContent>
                  <ItemTitle>{option.title}</ItemTitle>
                  <ItemDescription>{option.description}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRightIcon className="size-4" />
                </ItemActions>
              </button>
            </Item>
          ))}
          <Dialog>
            <DialogTrigger asChild>
              <Item
                asChild
                variant="outline"
                size="sm"
                className="cursor-pointer bg-white transition-all hover:bg-neutral-50 active:translate-y-px"
              >
                <button type="button">
                  <ItemMedia variant="icon" className="w-10">
                    <CircleHelpIcon className="size-5" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemDescription>
                      Download this as an application
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <ChevronRightIcon className="size-4" />
                  </ItemActions>
                </button>
              </Item>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add to Home Screen</DialogTitle>
                <DialogDescription>
                  Install glup on your phone for quick access, just like an
                  app.
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue={defaultInstallPlatform} className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="android" className="flex-1">
                    Android
                  </TabsTrigger>
                  <TabsTrigger value="ios" className="flex-1">
                    iOS
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="android">
                  <ol className="mt-1 list-decimal space-y-2.5 pl-4 text-muted-foreground">
                    <li>
                      Open this site in{' '}
                      <span className="font-medium text-foreground">
                        Chrome
                      </span>
                      .
                    </li>
                    <li>
                      Tap the{' '}
                      <span className="font-medium text-foreground">⋮</span>{' '}
                      menu in the top right.
                    </li>
                    <li>
                      Tap{' '}
                      <span className="font-medium text-foreground">
                        Add to Home screen
                      </span>{' '}
                      or{' '}
                      <span className="font-medium text-foreground">
                        Install app
                      </span>
                      .
                    </li>
                    <li>
                      Confirm to add glup to your home screen.
                    </li>
                  </ol>
                </TabsContent>
                <TabsContent value="ios">
                  <ol className="mt-1 list-decimal space-y-2.5 pl-4 text-muted-foreground">
                    <li>
                      Open this site in{' '}
                      <span className="font-medium text-foreground">
                        Safari
                      </span>
                      .
                    </li>
                    <li>
                      Tap the{' '}
                      <span className="font-medium text-foreground">
                        Share
                      </span>{' '}
                      button at the bottom.
                    </li>
                    <li>
                      Scroll and tap{' '}
                      <span className="font-medium text-foreground">
                        Add to Home Screen
                      </span>
                      .
                    </li>
                    <li>
                      Tap{' '}
                      <span className="font-medium text-foreground">Add</span>{' '}
                      to confirm.
                    </li>
                  </ol>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </ItemGroup>
      </div>

      <footer className="home-footer">
        <p className="home-credit">
          an application by{' '}
          <a
            className="home-credit-link"
            href="https://nietoarranz.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            nietoArranz
          </a>
        </p>
      </footer>
    </div>
  )
}
