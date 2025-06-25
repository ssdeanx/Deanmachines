'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";

const MASTRA_URL = process.env.NEXT_PUBLIC_COPILOTKIT_RUNTIME_URL || "http://localhost:4111";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAgent } from '../layout';
import { Settings, Server, Palette, Shield, Zap } from 'lucide-react';

export default function SettingsPage() {
    const { currentEndpoint, setCurrentEndpoint } = useAgent();
    const [debugMode, setDebugMode] = useState(true);
    const [autoSave, setAutoSave] = useState(true);
    const [theme, setTheme] = useState('system');
    const [apiTimeout, setApiTimeout] = useState('30');
    const [maxTokens, setMaxTokens] = useState('4000');
    const [temperature, setTemperature] = useState('0.7');

    // Make settings readable to agents
    useCopilotReadable({
        description: "Current playground settings and configuration",
        value: {
            debugMode,
            autoSave,
            theme,
            apiTimeout: parseInt(apiTimeout),
            maxTokens: parseInt(maxTokens),
            temperature: parseFloat(temperature),
            currentEndpoint,
        }
    });

    // Add action for updating settings
    useCopilotAction({
        name: "updateSettings",
        description: "Update playground settings and configuration",
        parameters: [
            {
                name: "setting",
                type: "string",
                description: "The setting to update",
                enum: ["debugMode", "autoSave", "theme", "apiTimeout", "maxTokens", "temperature"],
            },
            {
                name: "value",
                type: "string",
                description: "The new value for the setting",
            }
        ],
        handler: async ({ setting, value }) => {
            switch (setting) {
                case "debugMode":
                    setDebugMode(value === "true");
                    break;
                case "autoSave":
                    setAutoSave(value === "true");
                    break;
                case "theme":
                    setTheme(value);
                    break;
                case "apiTimeout":
                    setApiTimeout(value);
                    break;
                case "maxTokens":
                    setMaxTokens(value);
                    break;
                case "temperature":
                    setTemperature(value);
                    break;
            }
            return `Updated ${setting} to ${value}`;
        },
    });

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-card/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-6">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3"
                    >
                        <Settings className="h-8 w-8 text-primary" />
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
                            <p className="text-muted-foreground mt-1">
                                Configure your AI playground experience
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6">

                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="agents">Agents</TabsTrigger>
                        <TabsTrigger value="api">API</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="mt-6">
                        <div className="grid gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Palette className="h-5 w-5" />
                                        Appearance
                                    </CardTitle>
                                    <CardDescription>
                                        Customize the look and feel of your playground
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="theme">Theme</Label>
                                        <Select value={theme} onValueChange={setTheme}>
                                            <SelectTrigger className="w-32">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="light">Light</SelectItem>
                                                <SelectItem value="dark">Dark</SelectItem>
                                                <SelectItem value="system">System</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="h-5 w-5" />
                                        Privacy & Debug
                                    </CardTitle>
                                    <CardDescription>
                                        Control debugging and privacy settings
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label htmlFor="debug-mode">Debug Mode</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Show detailed logs and debugging information
                                            </p>
                                        </div>
                                        <Switch
                                            id="debug-mode"
                                            checked={debugMode}
                                            onCheckedChange={setDebugMode}
                                        />
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label htmlFor="auto-save">Auto Save</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Automatically save conversation history
                                            </p>
                                        </div>
                                        <Switch
                                            id="auto-save"
                                            checked={autoSave}
                                            onCheckedChange={setAutoSave}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="agents" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Server className="h-5 w-5" />
                                    Agent Configuration
                                </CardTitle>
                                <CardDescription>
                                    Current endpoint and agent settings
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label>Current Endpoint</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Input value={currentEndpoint} readOnly className="font-mono text-sm" />
                                        <Badge variant="outline">Active</Badge>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setCurrentEndpoint(`${MASTRA_URL}/copilotkit/base-network`)}
                                        >
                                            Base Network
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setCurrentEndpoint(`${MASTRA_URL}/copilotkit/master`)}
                                        >
                                            Master Agent
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setCurrentEndpoint(`${MASTRA_URL}/copilotkit/code`)}
                                        >
                                            Code Agent
                                        </Button>
                                    </div>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="max-tokens">Max Tokens</Label>
                                        <Input
                                            id="max-tokens"
                                            type="number"
                                            value={maxTokens}
                                            onChange={(e) => setMaxTokens(e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="temperature">Temperature</Label>
                                        <Input
                                            id="temperature"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="2"
                                            value={temperature}
                                            onChange={(e) => setTemperature(e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="api" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="h-5 w-5" />
                                    API Configuration
                                </CardTitle>
                                <CardDescription>
                                    Configure API timeouts and connection settings
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="api-timeout">API Timeout (seconds)</Label>
                                    <Input
                                        id="api-timeout"
                                        type="number"
                                        value={apiTimeout}
                                        onChange={(e) => setApiTimeout(e.target.value)}
                                        className="mt-1"
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        How long to wait for API responses before timing out
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="advanced" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Advanced Settings</CardTitle>
                                <CardDescription>
                                    Advanced configuration options for power users
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="p-4 bg-muted/50 rounded-lg">
                                        <h4 className="font-medium mb-2">Current Configuration</h4>
                                        <pre className="text-sm text-muted-foreground">
{JSON.stringify({
    debugMode,
    autoSave,
    theme,
    apiTimeout: parseInt(apiTimeout),
    maxTokens: parseInt(maxTokens),
    temperature: parseFloat(temperature),
}, null, 2)}
                                        </pre>
                                    </div>
                                    <Button variant="outline" className="w-full">
                                        Export Configuration
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
