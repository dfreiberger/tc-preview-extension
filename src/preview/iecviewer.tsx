import React, { useState, useEffect, lazy, Suspense } from 'react';

import 'prismjs';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-iecst'; // Language
import 'prismjs/plugins/line-numbers/prism-line-numbers';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/plugins/line-highlight/prism-line-highlight';
import 'prismjs/plugins/line-highlight/prism-line-highlight.css';
import 'prismjs/plugins/toolbar/prism-toolbar';
import 'prismjs/plugins/toolbar/prism-toolbar.css';

import { copyToClipboard } from 'azure-devops-ui/Clipboard';

import dark from './prism-dark.module.scss';
import light from './prism-light.module.scss';

Prism.manual = true;


type IecViewerData = {
    xml?: XMLDocument;
    parentUrl?: string;
    urlParams?: { [key: string]: string };
}

type IecElement = {
    section: string,
    name: string,
    element: Element,
    urlParams?: { [key: string]: string }
}

const IecSection = ({ section, element, urlParams }: IecElement) => {
    const declaration = element.getElementsByTagName("Declaration")[0];
    const declarationContent = declaration ? declaration.textContent : "No content"

    const implementation = element.getElementsByTagName("Implementation")[0];
    const implementationST = implementation ? implementation.getElementsByTagName("ST")[0] : null;
    const implementationContent = implementationST ? implementationST.textContent : "Unable to display content, it may be an unsupported format"

    const highlightDeclaration = urlParams?.section === `declaration-${section}` ? urlParams?.lines ?? "" : "";
    const highlightImplementation = urlParams?.section === `implementation-${section}` ? urlParams?.lines ?? "" : "";
    
    return (
        <div>
            {(declaration && 
            <pre className='line-numbers declaration-section' data-line={highlightDeclaration}> 
                <code className='language-iecst' id={`declaration-${section}`}>
                        {declarationContent}
                </code>
            </pre> )}
            {(implementation && 
            <pre className='line-numbers implementation-section' data-line={highlightImplementation}> 
                <code className='language-iecst' id={`implementation-${section}`}>
                    {implementationContent}
                </code>
            </pre> )}
        </div>
    )
};


const PouOrItfSection = ({ element, urlParams }: IecElement) => {
    const pouNodes = Array.from(element.children);
    const pouName = `(POU) ${element.getAttribute("Name")}`;
    const sectionName = element.getAttribute("Name") ?? "pou";

    pouNodes.sort((a, b) => {
        try {
            var aFolder = a.getAttribute("FolderPath") ?? "";
            var aName = a.getAttribute("Name") ?? "";
            var aAttr = aFolder + aName;

            var bFolder = b.getAttribute("FolderPath") ?? "";
            var bName = b.getAttribute("Name") ?? "";
            var bAttr = bFolder + bName;

            if (aAttr < bAttr)
                return -1; // First should be sorted above second
            else if (aAttr < bAttr)
                return 1; // Second should be sorted above first
            return 0;
        }
        catch
        {
            return 1;
        }
    });

    // Get all Methods, Actions, Transitions, and Properties
    return (
        <div className='iec-section'>
            <IecSection key={pouName} name={pouName} element={element} section={sectionName} urlParams={urlParams}/>
            {pouNodes.map((c, i) => {
                const folderPath = c.getAttribute("FolderPath");
                var childName = folderPath ? folderPath : "";
                childName += c.getAttribute("Name");
                var name = `(${c.nodeName}) ${childName}`;
                var key = childName;

                switch (c.nodeName) {
                    case "Method":
                    case "Action":
                    case "Transition":
                        return <IecSection key={key} name={name} element={c} section={key} urlParams={urlParams}/>
                    case "Property":
                        const setter = c.getElementsByTagName("Set")[0];
                        const getter = c.getElementsByTagName("Get")[0];
                        var sections = new Array();
                        if (setter) {
                            const pName = name + ".Set";
                            sections.push(<IecSection key={key + "-set"} name={pName} element={setter} section={key + "-set"} urlParams={urlParams}/>);
                        }
                        if (getter) {
                            const pName = name + ".Get";
                            sections.push(<IecSection key={key + "-get"} name={pName} element={getter} section={key + "-get"} urlParams={urlParams}/>);
                        }
                        return sections;
                    case "Folder":
                        break;
                    default:
                        //
                }
            })
        }
        </div>
    )
}

const IecViewer = ({ xml, parentUrl, urlParams }: IecViewerData) => {
    if (!xml) {
        return (
            <div>No content</div>
        )
    }

    useEffect(() => {
        Prism.plugins.toolbar.registerButton('copy-link', {
            text: 'Copy link',
            onClick: (env: any) => {
                const targetUrl = parentUrl + "&section=" + env.element.id;
                copyToClipboard(targetUrl);
            }
        });

        Prism.highlightAll();

        // if section is specified in the url, scroll to it
        const section = urlParams?.section;
        if (section) {
            const sectionElement = document.querySelector( `#${section}`);
            sectionElement?.scrollIntoView( { behavior: 'auto', block: 'start' } );
        }
    }, [xml]);

    const [currentTheme, setCurrentTheme] = useState(light.light_theme);

    // hack to set the theme based on an event generated by the SDK and/or the currently set palette
    useEffect(() => {
        const onThemeChanged = (event : any) => {
            if (event.detail.name === "Dark")
                setCurrentTheme(dark.dark_theme)
            else
                setCurrentTheme(light.light_theme)
        };

        window.addEventListener("themeChanged", onThemeChanged); 
        
        // get the current theme by looking at the palette
        // this may break in the future but was the only way I could figure out to access the theme
        // without depending on an external API call
        const bodyStyles = window.getComputedStyle(document.body);
        var primary = bodyStyles.getPropertyValue('--palette-primary').trim();
        if (primary === "0, 129, 227")
            setCurrentTheme(dark.dark_theme)

        return () => {
            window.removeEventListener("themeChanged", onThemeChanged);
        }
    })

    return (
        <div className={currentTheme}>
            {Array.from(xml.children[0].children).map((n, i) => {
                var name = n.getAttribute("Name") ?? "?";
                const section = "main-iec-content";
                switch (n.nodeName) {
                    case "DUT":
                        return <IecSection key={i} name={name} element={n} section={section} urlParams={urlParams}/>
                    case "POU":
                        return <PouOrItfSection key={i} name={name} element={n} section={section} urlParams={urlParams}/>
                    case "GVL":
                        return <IecSection key={i} name={name} element={n} section={section} urlParams={urlParams}/>
                    case "Itf":
                        return <PouOrItfSection key={i} name={name} element={n} section={section} urlParams={urlParams}/>
                    default:
                        console.log("Unsupported type, ", n.nodeName);
                }
            })}
        </div>
    )
};

export default IecViewer;